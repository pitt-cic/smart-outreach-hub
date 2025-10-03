import {APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSRecord} from 'aws-lambda';
import {PinpointSMSVoiceV2Client, SendTextMessageCommand} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import {ChatMessageModel, CustomerModel, CampaignCustomerModel, CampaignModel} from '../../shared/database';
import {
    createErrorResponse,
    createSuccessResponse,
    logError,
    logInfo,
    logWarn,
    normalizePhoneNumber,
    validatePhoneNumber
} from '../../shared/utils';
import { UserSentiment, CampaignMetrics } from '../../shared/types';

const pinpointClient = new PinpointSMSVoiceV2Client({region: process.env.AWS_REGION});

interface SendSMSRequest {
    phoneNumber: string;
    message: string;
    campaignId?: string;
}

interface AgentResponse {
    response_text: string;
    should_handoff: boolean;
    handoff_reason?: string
    user_sentiment?: UserSentiment;
    guardrails_intervened: boolean
    campaign_id: string;
}

interface CampaignMessage {
    phoneNumber: string;
    message: string;
    campaignId: string;
    customerId: string;
    messageType: 'campaign';
}

interface ManualMessage {
    phoneNumber: string;
    message: string;
    messageType: 'manual';
    messageId?: string;
}

interface SQSMessageBody {
    phone_number?: string;
    agent_response?: AgentResponse;
    campaign_id?: string;
    timestamp?: number;
    // New fields for personalized campaigns
    phoneNumber?: string;
    message?: string;
    campaignId?: string;
    customerId?: string;
    messageType?: 'campaign' | 'manual';
}

interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
    status: 'sent' | 'failed';
}

export const handler = async (event: APIGatewayProxyEvent | SQSEvent): Promise<APIGatewayProxyResult | any> => {
    try {
        // Handle SQS events
        if ('Records' in event) {
            return await handleSQSEvent(event as SQSEvent);
        }

        // Handle API Gateway events
        return await handleAPIGatewayEvent(event as APIGatewayProxyEvent);

    } catch (error) {
        logError('Error in direct SMS function', error);

        if ('Records' in event) {
            return {
                batchItemFailures: (event as SQSEvent).Records.map(record => ({
                    itemIdentifier: record.messageId
                }))
            };
        } else {
            return createErrorResponse('Internal server error', 500);
        }
    }
};

async function handleAPIGatewayEvent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        logInfo('Direct SMS function invoked via API Gateway', {
            method: event.httpMethod,
            path: event.path
        });

        if (event.httpMethod !== 'POST') {
            return createErrorResponse('Method not allowed', 405);
        }

        if (!event.body) {
            return createErrorResponse('Missing request body', 400);
        }

        const request: SendSMSRequest = JSON.parse(event.body);
        const {phoneNumber, message, campaignId} = request;

        // Validate input
        if (!phoneNumber || !message) {
            return createErrorResponse('Phone number and message are required', 400);
        }

        if (!validatePhoneNumber(phoneNumber)) {
            return createErrorResponse('Invalid phone number format', 400);
        }

        if (message.trim().length === 0) {
            return createErrorResponse('Message cannot be empty', 400);
        }

        if (message.length > 1600) { // SMS limit
            return createErrorResponse('Message too long (max 1600 characters)', 400);
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Check if a customer exists
        let customer = await CustomerModel.findByPhoneNumber(normalizedPhone);
        if (!customer) {
            customer = await CustomerModel.create({
                phone_number: normalizedPhone,
                first_name: 'Unknown',
                last_name: 'Customer',
                status: 'agent_responding',
                most_recent_campaign_id: campaignId,
            });
            logInfo('Created new customer record', {phoneNumber: normalizedPhone});
        } else {
            // Update customer status
            await CustomerModel.update(normalizedPhone, {
                status: 'agent_responding',
                updated_at: new Date().toISOString(),
                ...(campaignId && {most_recent_campaign_id: campaignId})
            });
        }

        // Send SMS via AWS End User Messaging
        const smsResult = await sendSMS(normalizedPhone, message.trim());

        // Store message in a database
        const dbMessage = await ChatMessageModel.create({
            phone_number: normalizedPhone,
            campaign_id: campaignId,
            message: message.trim(),
            direction: 'outbound',
            response_type: 'manual',
            external_message_id: smsResult.messageId,
            status: smsResult.status,
            error_message: smsResult.error,
            sent_at: smsResult.success ? new Date().toISOString() : undefined,
        });

        logInfo('Direct SMS processed', {
            phoneNumber: normalizedPhone,
            messageId: dbMessage.id,
            externalMessageId: smsResult.messageId,
            success: smsResult.success,
            status: smsResult.status
        });

        if (smsResult.success) {
            return createSuccessResponse({
                messageId: dbMessage.id,
                externalMessageId: smsResult.messageId,
                phoneNumber: normalizedPhone,
                message: message.trim(),
                status: smsResult.status,
                sentAt: new Date().toISOString()
            });
        } else {
            return createErrorResponse(`Failed to send SMS: ${smsResult.error}`, 500, {
                messageId: dbMessage.id,
                phoneNumber: normalizedPhone,
                error: smsResult.error
            });
        }

    } catch (error) {
        logError('Error in API Gateway direct SMS function', error);
        return createErrorResponse('Internal server error', 500);
    }
}

async function handleSQSEvent(event: SQSEvent): Promise<any> {
    const results = await Promise.allSettled(
        event.Records.map(processSQSRecord)
    );

    const batchItemFailures: any[] = [];

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            logError(`Failed to process SQS record ${index}`, result.reason);
            batchItemFailures.push({
                itemIdentifier: event.Records[index].messageId
            });
        }
    });

    return {
        batchItemFailures
    };
}

async function processSQSRecord(record: SQSRecord): Promise<void> {
    try {
        logInfo('Processing SQS record', {messageId: record.messageId});

        // Parse the SQS message body
        const messageBody: SQSMessageBody = JSON.parse(record.body);

        // Check if this is a campaign message (unified or personalized)
        if (messageBody.messageType === 'campaign') {
            await processCampaignMessage(messageBody as CampaignMessage);
            return;
        }

        // Check if this is a manual message
        if (messageBody.messageType === 'manual') {
            await processManualMessage(messageBody as ManualMessage);
            return;
        }

        // Handle legacy AI agent response format
        const { phone_number, agent_response } = messageBody;

        if (!phone_number || !agent_response) {
            throw new Error('Missing phone_number or agent_response in SQS message');
        }

        // Extract the message text from the agent response
        const message = agent_response.response_text;
        if (!message || message.trim().length === 0) {
            throw new Error('Empty message in agent response');
        }

        await updateCampaignMetrics(agent_response.campaign_id, phone_number, agent_response);

        await sendAgentResponseSMS(phone_number, message, agent_response);

    } catch (error) {
        logError('Error processing SQS record', error);
        throw error; // This will cause SQS to retry
    }
}

async function processCampaignMessage(message: CampaignMessage): Promise<void> {
    try {
        const {phoneNumber, message: messageText, campaignId, customerId} = message;

        logInfo('Processing campaign message (unified or personalized)', {
            phoneNumber,
            campaignId,
            messageLength: messageText.length
        });

        if (!validatePhoneNumber(phoneNumber)) {
            throw new Error(`Invalid phone number format: ${phoneNumber}`);
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // Send SMS via AWS End User Messaging
        const smsResult = await sendSMS(normalizedPhone, messageText);

        // Store message in a database
        await ChatMessageModel.create({
            phone_number: normalizedPhone,
            campaign_id: campaignId,
            message: messageText,
            direction: 'outbound',
            response_type: 'automated',
            external_message_id: smsResult.messageId,
            status: smsResult.status,
            error_message: smsResult.error,
            sent_at: smsResult.success ? new Date().toISOString() : undefined,
        });

        // Update campaign-customer status based on SMS result
        const campaignCustomerStatus = smsResult.success ? 'sent' : 'failed';
        try {
            await CampaignCustomerModel.updateStatus(campaignId, normalizedPhone, campaignCustomerStatus);
            logInfo('Updated campaign-customer status', {
                phoneNumber: normalizedPhone,
                campaignId,
                status: campaignCustomerStatus
            });
        } catch (updateError) {
            logError('Failed to update campaign-customer status', {
                phoneNumber: normalizedPhone,
                campaignId,
                status: campaignCustomerStatus,
                error: updateError instanceof Error ? updateError.message : 'Unknown error'
            });
            // Don't throw here - we still want to log the SMS result even if campaign-customer update fails
        }

        logInfo('Campaign SMS processed successfully', {
            phoneNumber: normalizedPhone,
            campaignId,
            messageId: smsResult.messageId,
            success: smsResult.success,
            status: smsResult.status,
            campaignCustomerStatus
        });

        if (!smsResult.success) {
            throw new Error(`SMS sending failed: ${smsResult.error}`);
        }

    } catch (error) {
        logError('Error processing campaign message (unified or personalized)', error);
        throw error;
    }
}

/**
 * Process a manual message from SQS
 */
async function processManualMessage(message: ManualMessage): Promise<void> {
    try {
        logInfo('Processing manual message', {
            phoneNumber: message.phoneNumber,
            messageId: message.messageId,
            messageLength: message.message.length
        });

        if (!validatePhoneNumber(message.phoneNumber)) {
            throw new Error(`Invalid phone number format: ${message.phoneNumber}`);
        }

        const normalizedPhone = normalizePhoneNumber(message.phoneNumber);

        // Send SMS via AWS End User Messaging
        const smsResult = await sendSMS(normalizedPhone, message.message);

        logInfo('Manual SMS processed successfully', {
            phoneNumber: normalizedPhone,
            messageId: message.messageId,
            externalMessageId: smsResult.messageId,
            success: smsResult.success,
            status: smsResult.status
        });

        if (!smsResult.success) {
            throw new Error(`SMS sending failed: ${smsResult.error}`);
        }

    } catch (error) {
        logError('Error processing manual message', error);
        throw error;
    }
}

async function sendAgentResponseSMS(phoneNumber: string, message: string, agentResponse: AgentResponse): Promise<void> {
    try {
        if (!validatePhoneNumber(phoneNumber)) {
            throw new Error(`Invalid phone number format: ${phoneNumber}`);
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        // TODO: Revisit this -Update customer status to indicate agent is responding
        // This is handled by the AI Agent Lambda function
        // let customer = await CustomerModel.findByPhoneNumber(normalizedPhone);
        // if (!customer) {
        //     customer = await CustomerModel.create({
        //         phone_number: normalizedPhone,
        //         first_name: 'Unknown',
        //         last_name: 'Customer',
        //         status: 'agent_responding',
        //     });
        //     logInfo('Created new customer record', { phoneNumber: normalizedPhone });
        // } else {
        //     await CustomerModel.update(normalizedPhone, {
        //         status: 'agent_responding',
        //         updated_at: new Date().toISOString()
        //     });
        // }

        // Send SMS via AWS End User Messaging
        const smsResult = await sendSMS(normalizedPhone, message);

        // Store message in a database with agent response metadata
        await ChatMessageModel.create({
            phone_number: normalizedPhone,
            campaign_id: agentResponse.campaign_id,
            message: message,
            direction: 'outbound',
            response_type: 'ai_agent',
            should_handoff: agentResponse.should_handoff,
            handoff_reason: agentResponse.handoff_reason,
            external_message_id: smsResult.messageId,
            status: smsResult.status,
            error_message: smsResult.error,
            sent_at: smsResult.success ? new Date().toISOString() : undefined,
        });

        logInfo('Agent response SMS processed successfully', {
            phoneNumber: normalizedPhone,
            messageId: smsResult.messageId,
            success: smsResult.success,
            status: smsResult.status,
        });

        if (!smsResult.success) {
            throw new Error(`SMS sending failed: ${smsResult.error}`);
        }

    } catch (error) {
        logError('Error sending agent response SMS', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(String(error));
    }
}

async function sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
        logInfo('Sending SMS via End User Messaging', {
            phoneNumber,
            messageLength: message.length
        });

        if (!process.env.ORIGINATION_IDENTITY) {
            throw new Error('ORIGINATION_IDENTITY environment variable not set');
        }

        const result = await pinpointClient.send(new SendTextMessageCommand({
            DestinationPhoneNumber: phoneNumber,
            OriginationIdentity: process.env.ORIGINATION_IDENTITY,
            MessageBody: message,
            MessageType: 'PROMOTIONAL',
            // ConfigurationSetName: process.env.SMS_CONFIGURATION_SET, // Optional
        }));

        logInfo('SMS sent successfully', {
            phoneNumber,
            messageId: result.MessageId,
            status: 'sent'
        });

        return {
            success: true,
            messageId: result.MessageId,
            status: 'sent',
        };

    } catch (error: any) {
        logError('Failed to send SMS', {
            phoneNumber,
            error: error.message,
            errorCode: error.name,
            errorDetails: error
        });

        return {
            success: false,
            error: error.message || 'Unknown error',
            status: 'failed',
        };
    }
}

async function updateCampaignMetrics(campaignId: string, phoneNumber: string, agentResponse: AgentResponse): Promise<void> {
    const campaignCustomer = await CampaignCustomerModel.findByCampaignAndPhone(agentResponse.campaign_id, phoneNumber);
    if (!campaignCustomer) {
        logWarn('Campaign customer not found', {
            campaignId: agentResponse.campaign_id,
            phoneNumber: phoneNumber
        });
    } else {
        let campaignMetrics: CampaignMetrics = {};
        const userSentiment: UserSentiment = agentResponse.user_sentiment || 'neutral';

        // Update campaign metrics for all user responses
        if (userSentiment === 'positive') {
            campaignMetrics.positive_response_count = 1;
        } else if (userSentiment === 'neutral') {
            campaignMetrics.neutral_response_count = 1;
        } else if (userSentiment === 'negative') {
            campaignMetrics.negative_response_count = 1;
        }

        // Update campaign metrics for the first response
        if (campaignCustomer.status === 'sent') {
            await CampaignCustomerModel.updateStatus(agentResponse.campaign_id, phoneNumber, 'processed');

            campaignMetrics.response_count = 1;
    
            if (userSentiment === 'positive') {
                campaignMetrics.first_response_positive_count = 1;
            } else if (userSentiment === 'neutral') {
                campaignMetrics.first_response_neutral_count = 1;
            } else if (userSentiment === 'negative') {
                campaignMetrics.first_response_negative_count = 1;
            }
        }

        // Update campaign qualification metrics for first or subsequent responses when handoff occurs
        if (campaignCustomer.status === 'sent' || campaignCustomer.status === 'processed') {
            if (agentResponse.should_handoff) {
                if (userSentiment === 'positive') {
                    campaignMetrics.positive_handoff_count = 1;
                } else if (userSentiment === 'neutral') {
                    campaignMetrics.neutral_handoff_count = 1;
                } else if (userSentiment === 'negative') {
                    campaignMetrics.negative_handoff_count = 1;
                }
            }
        }

        if (Object.keys(campaignMetrics).length > 0) {
            await CampaignModel.updateCampaignMetrics(campaignId, campaignMetrics);
        }
    }
}

// Health check endpoint
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
    return createSuccessResponse({
        service: 'Direct SMS Function',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
            region: process.env.AWS_REGION,
            hasOriginationIdentity: !!process.env.ORIGINATION_IDENTITY,
        }
    });
};
