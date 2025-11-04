import { SQSRecord } from 'aws-lambda';
import { ChatMessageModel, CustomerModel } from '../../shared/dynamodb';
import { logError, logInfo } from '../../shared/log-utils';
import { normalizePhoneNumber, validatePhoneNumber } from '../../shared/utils';
import { LambdaService } from './services/lambda-service';
import { InboundSMSMessage, SNSMessage } from './types';

export async function processSQSRecord(record: SQSRecord): Promise<void> {
    try {
        // Parse SNS message from SQS
        const snsMessage: SNSMessage = JSON.parse(record.body);

        // Parse the actual SMS data from SNS message
        const messageData = JSON.parse(snsMessage.Message);

        // Extract SMS details (format depends on End User Messaging webhook format)
        const smsMessage: InboundSMSMessage = {
            fromPhoneNumber: messageData.originationNumber,
            toPhoneNumber: messageData.destinationNumber,
            messageBody: messageData.messageBody,
            messageId: messageData.inboundMessageId,
            timestamp: snsMessage.Timestamp,
        };

        logInfo('Processing SNS message from SQS', {
            snsMessageId: snsMessage.MessageId,
            messageId: smsMessage.messageId,
            phoneNumber: smsMessage.fromPhoneNumber,
            messageBody: smsMessage.messageBody,
        });

        await processInboundMessage(smsMessage);
    } catch (error) {
        logError('Error processing SQS record', error);
        throw error; // This will cause SQS to retry
    }
}

async function processInboundMessage(smsMessage: InboundSMSMessage): Promise<void> {
    try {
        // Skip validation if phone number is missing
        if (!smsMessage.fromPhoneNumber) {
            logInfo('Skipping processing - no from phone number');
            return;
        }

        // Validate and normalize phone number
        if (!validatePhoneNumber(smsMessage.fromPhoneNumber)) {
            logError('Invalid from phone number', { phoneNumber: smsMessage.fromPhoneNumber });
            return;
        }

        const normalizedPhone = normalizePhoneNumber(smsMessage.fromPhoneNumber);

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
            logInfo('Created new customer record', { phoneNumber: normalizedPhone });
        } else {
            if (customer.status == 'agent_responding') {
                // Update existing customer status to needs_response
                await CustomerModel.update(normalizedPhone, {
                    status: 'needs_response',
                    updated_at: new Date().toISOString(),
                });
                logInfo('Updated customer status to needs_response', { phoneNumber: normalizedPhone });
            }
        }

        // Store inbound message in DynamoDB with campaign ID
        const dbMessage = await ChatMessageModel.create({
            phone_number: normalizedPhone,
            message: smsMessage.messageBody,
            direction: 'inbound',
            external_message_id: smsMessage.messageId,
            campaign_id: customer.most_recent_campaign_id,
        });

        logInfo('Stored inbound message in database', {
            messageId: dbMessage.id,
            phoneNumber: normalizedPhone,
            campaignId: customer.most_recent_campaign_id,
        });

        // Trigger AI Agent for automated response (async)
        if (!process.env.AI_AGENT_FUNCTION_NAME) {
            logError('AI agent function name not configured, skipping AI trigger');
            return;
        }

        try {
            await LambdaService.asyncInvokeLambda(
                process.env.AI_AGENT_FUNCTION_NAME,
                JSON.stringify({
                    phone_number: smsMessage.fromPhoneNumber,
                    message: smsMessage.messageBody,
                    message_id: dbMessage.id,
                    customer_id: normalizedPhone,
                })
            );
        } catch (error) {
            logError('Failed to trigger AI agent', error);
        }
    } catch (error) {
        logError('Error processing inbound message', error);
        throw error;
    }
}
