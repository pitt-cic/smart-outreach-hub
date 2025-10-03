import {APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent, SQSRecord} from 'aws-lambda';
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';
import {ChatMessageModel, CustomerModel} from '../../shared/database';
import {
    createErrorResponse,
    createSuccessResponse,
    logError,
    logInfo,
    normalizePhoneNumber,
    validatePhoneNumber
} from '../../shared/utils';

const lambdaClient = new LambdaClient({region: process.env.AWS_REGION});

interface InboundSMSMessage {
    originationPhoneNumber: string;
    destinationPhoneNumber: string;
    messageBody: string;
    messageId: string;
    timestamp?: string;
}

interface SNSMessage {
    Type: string;
    MessageId: string;
    TopicArn: string;
    Subject?: string;
    Message: string;
    Timestamp: string;
}

export const handler = async (event: SQSEvent | APIGatewayProxyEvent): Promise<any> => {
    try {
        // Handle API Gateway webhook events (direct SMS webhook)
        if ('httpMethod' in event) {
            return await handleWebhookEvent(event as APIGatewayProxyEvent);
        }

        if ('Records' in event) {
            return await handleSQSEvent(event as SQSEvent);
        }

        throw new Error('Unknown event type');
    } catch (error) {
        logError('Error in inbound SMS processor', error);
        throw error;
    }
};

async function handleWebhookEvent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        logInfo('Processing webhook SMS event', {
            method: event.httpMethod,
            path: event.path,
            headers: event.headers
        });

        if (!event.body) {
            return createErrorResponse('Missing request body', 400);
        }

        // Parse the webhook payload (format depends on SMS provider)
        const webhookData = JSON.parse(event.body);

        // Extract SMS data (this format may need adjustment based on your SMS provider)
        const smsMessage: InboundSMSMessage = {
            originationPhoneNumber: webhookData.from || webhookData.originationPhoneNumber,
            destinationPhoneNumber: webhookData.to || webhookData.destinationPhoneNumber,
            messageBody: webhookData.body || webhookData.messageBody || webhookData.text,
            messageId: webhookData.messageId || webhookData.id,
            timestamp: webhookData.timestamp || new Date().toISOString(),
        };

        await processInboundMessage(smsMessage);

        return createSuccessResponse({
            message: 'SMS processed successfully',
            messageId: smsMessage.messageId
        });

    } catch (error) {
        logError('Error processing webhook SMS', error);
        return createErrorResponse('Failed to process SMS webhook', 500);
    }
}

async function handleSQSEvent(event: SQSEvent): Promise<void> {
    const results = await Promise.allSettled(
        event.Records.map(processSQSRecord)
    );

    // Log any failures for monitoring
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            logError(`Failed to process SQS record ${index}`, result.reason);
        }
    });
}

async function processSQSRecord(record: SQSRecord): Promise<void> {
    try {
        // Parse SNS message from SQS
        const snsMessage: SNSMessage = JSON.parse(record.body);

        logInfo('Processing SNS message from SQS', snsMessage);

        // Log the raw message to understand the format
        console.log('=== RAW SNS MESSAGE ===');
        console.log('Message:', snsMessage.Message);
        console.log('======================');

        // Parse the actual SMS data from SNS message
        const messageData = JSON.parse(snsMessage.Message);

        console.log('=== PARSED MESSAGE DATA ===');
        console.log(JSON.stringify(messageData, null, 2));
        console.log('===========================');

        // Extract SMS details (format depends on End User Messaging webhook format)
        const smsMessage: InboundSMSMessage = {
            originationPhoneNumber: messageData.originationNumber,
            destinationPhoneNumber: messageData.destinationNumber,
            messageBody: messageData.messageBody,
            messageId: messageData.inboundMessageId,
            timestamp: snsMessage.Timestamp,
        };

        await processInboundMessage(smsMessage);

    } catch (error) {
        logError('Error processing SQS record', error);
        throw error; // This will cause SQS to retry
    }
}

async function processInboundMessage(smsMessage: InboundSMSMessage): Promise<void> {
    try {
        const {originationPhoneNumber, destinationPhoneNumber, messageBody, messageId, timestamp} = smsMessage;

        // Simple console logging as requested
        console.log('=== INBOUND SMS RECEIVED ===');
        console.log(`From: ${originationPhoneNumber || 'Unknown'}`);
        console.log(`To: ${destinationPhoneNumber || 'Unknown'}`);
        console.log(`Message: ${messageBody || 'No message'}`);
        console.log(`Message ID: ${messageId || 'No ID'}`);
        console.log(`Timestamp: ${timestamp || new Date().toISOString()}`);
        console.log('============================');

        logInfo('Processing inbound SMS', {
            from: originationPhoneNumber,
            to: destinationPhoneNumber,
            message: messageBody,
            messageId
        });

        // Skip validation if phone number is missing
        if (!originationPhoneNumber) {
            logInfo('Skipping processing - no origination phone number');
            return;
        }

        // Validate and normalize phone number
        if (!validatePhoneNumber(originationPhoneNumber)) {
            logError('Invalid origination phone number', {phoneNumber: originationPhoneNumber});
            return;
        }

        const normalizedPhone = normalizePhoneNumber(originationPhoneNumber);

        // Get or create customer record first
        let customer = await CustomerModel.findByPhoneNumber(normalizedPhone);
        if (!customer) {
            // Create new customer with basic info
            customer = await CustomerModel.create({
                phone_number: normalizedPhone,
                first_name: 'Unknown', // Will be updated when we have more info
                last_name: 'Customer',
                status: 'needs_response',
            });
            logInfo('Created new customer record', {phoneNumber: normalizedPhone});
        } else {
            if (customer.status == 'agent_responding') {
                // Update existing customer status to needs_response
                await CustomerModel.update(normalizedPhone, {
                    status: 'needs_response',
                    updated_at: new Date().toISOString()
                });
                logInfo('Updated customer status to needs_response', {phoneNumber: normalizedPhone});
            }
        }

        // Store inbound message in DynamoDB with campaign ID
        const dbMessage = await ChatMessageModel.create({
            phone_number: normalizedPhone,
            message: messageBody,
            direction: 'inbound',
            external_message_id: messageId,
            campaign_id: customer.most_recent_campaign_id,
        });

        logInfo('Stored inbound message in database', {
            messageId: dbMessage.id,
            phoneNumber: normalizedPhone,
            campaignId: customer.most_recent_campaign_id
        });

        // Check for opt-out keywords
        const lowerMessage = messageBody.toLowerCase().trim();
        if (lowerMessage === 'stop' || lowerMessage === 'unsubscribe' || lowerMessage === 'opt out') {
            logInfo('Processing opt-out request', {phoneNumber: normalizedPhone});

            // Update customer status to opted out
            await CustomerModel.update(normalizedPhone, {
                status: 'automated', // or create an 'opted_out' status
                updated_at: new Date().toISOString()
            });

            // Store opt-out confirmation message
            await ChatMessageModel.create({
                phone_number: normalizedPhone,
                message: 'You have been unsubscribed from our messages. Reply START to opt back in.',
                direction: 'outbound',
                response_type: 'automated',
            });

            return; // Don't trigger AI agent for opt-out messages
        }

        // Check for opt-in keywords
        if (lowerMessage === 'start' || lowerMessage === 'subscribe' || lowerMessage === 'opt in') {
            logInfo('Processing opt-in request', {phoneNumber: normalizedPhone});

            await CustomerModel.update(normalizedPhone, {
                status: 'automated',
                updated_at: new Date().toISOString()
            });

            // Store opt-in confirmation message
            await ChatMessageModel.create({
                phone_number: normalizedPhone,
                message: 'Welcome back! You are now subscribed to our messages.',
                direction: 'outbound',
                response_type: 'automated',
            });

            return;
        }

        // Trigger AI Agent for automated response (async)
        if (process.env.AI_AGENT_FUNCTION_NAME) {
            try {
                const response = await lambdaClient.send(new InvokeCommand({
                    FunctionName: process.env.AI_AGENT_FUNCTION_NAME,
                    InvocationType: 'Event', // Async invocation
                    Payload: JSON.stringify({
                        phone_number: originationPhoneNumber,
                        message: messageBody,
                        message_id: dbMessage.id,
                        customer_id: normalizedPhone,
                    }),
                }));

                if (response.StatusCode == 202) {
                    logInfo('Triggered AI agent for automated response', {
                        phoneNumber: normalizedPhone,
                        messageId: dbMessage.id
                    });
                    logInfo('Invocation response', response);
                } else if (response.FunctionError) {
                    logError('Failed to trigger AI agent', response.FunctionError);
                }
            } catch (error) {
                logError('Failed to trigger AI agent', error);
                // Don't throw error - message is still processed and stored
            }
        }

    } catch (error) {
        logError('Error processing inbound message', error);
        throw error;
    }
}
