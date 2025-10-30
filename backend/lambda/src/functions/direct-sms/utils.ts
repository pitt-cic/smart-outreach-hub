import { SQSRecord } from 'aws-lambda';
import { CampaignCustomerModel, CampaignModel, ChatMessageModel } from '../../shared/dynamodb';
import { logError, logInfo, logWarn } from '../../shared/log-utils';
import { CampaignMetrics, UserSentiment } from '../../shared/types';
import { maskPhoneNumber, normalizePhoneNumber, validatePhoneNumber } from '../../shared/utils';
import { SMSService } from './services/sms-service';
import { AgentResponse, CampaignMessage, ManualMessage, SQSMessageBody } from './types';


export async function processSQSRecord(record: SQSRecord): Promise<void> {
  try {
    logInfo('Processing SQS record', { messageId: record.messageId });

    const messageType = record.messageAttributes?.messageType?.stringValue;

    // Parse the SQS message body
    const messageBody: SQSMessageBody = JSON.parse(record.body);

    // Check if this is a campaign message (unified or personalized)
    if ('campaign' === messageType) {
      await processCampaignMessage(messageBody as CampaignMessage);
      return;
    }

    // Check if this is a manual message
    if ('manual' === messageType) {
      await processManualMessage(messageBody as ManualMessage);
      return;
    }

    // Check if this is an agent response message
    if ('agent_response' === messageType) {
      const { phoneNumber, agentResponse } = messageBody;
  
      if (!phoneNumber || !agentResponse) {
        throw new Error('Missing phoneNumber or agentResponse in SQS message');
      }
  
      // Extract the message text from the agent response
      const message = agentResponse.response_text;
      if (!message || message.trim().length === 0) {
        throw new Error('Empty message in agent response');
      }
  
      await processAgentResponse(phoneNumber, message, agentResponse);
    }

    // Throw error for unknown message types
    throw new Error(`Unknown message type: ${messageType}`);
  } catch (error) {
    logError('Error processing SQS record', error);
    throw error; // This will cause SQS to retry
  }
}

async function processCampaignMessage(message: CampaignMessage): Promise<void> {
  try {
    const { phoneNumber, message: messageText, campaignId } = message;

    logInfo('Processing campaign message (unified or personalized)', {
      phoneNumber: maskPhoneNumber(phoneNumber),
      campaignId,
      messageLength: messageText.length,
    });

    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error(`Invalid phone number format: ${maskPhoneNumber(phoneNumber)}`);
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Send SMS via AWS End User Messaging
    const smsResult = await SMSService.sendSMS(normalizedPhone, messageText);

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
        phoneNumber: maskPhoneNumber(normalizedPhone),
        campaignId,
        status: campaignCustomerStatus,
      });
    } catch (updateError) {
      logError('Failed to update campaign-customer status', {
        phoneNumber: maskPhoneNumber(normalizedPhone),
        campaignId,
        status: campaignCustomerStatus,
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
      });
      // Don't throw here - we still want to log the SMS result even if campaign-customer update fails
    }

    logInfo('Campaign SMS processed successfully', {
      phoneNumber: maskPhoneNumber(normalizedPhone),
      campaignId,
      messageId: smsResult.messageId,
      success: smsResult.success,
      status: smsResult.status,
      campaignCustomerStatus,
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
      phoneNumber: maskPhoneNumber(message.phoneNumber),
      messageId: message.messageId,
      messageLength: message.message.length,
    });

    if (!validatePhoneNumber(message.phoneNumber)) {
      throw new Error(`Invalid phone number format: ${maskPhoneNumber(message.phoneNumber)}`);
    }

    const normalizedPhone = normalizePhoneNumber(message.phoneNumber);

    // Send SMS via AWS End User Messaging
    const smsResult = await SMSService.sendSMS(normalizedPhone, message.message);

    logInfo('Manual SMS processed successfully', {
      phoneNumber: maskPhoneNumber(normalizedPhone),
      messageId: message.messageId,
      externalMessageId: smsResult.messageId,
      success: smsResult.success,
      status: smsResult.status,
    });

    if (!smsResult.success) {
      throw new Error(`SMS sending failed: ${smsResult.error}`);
    }
  } catch (error) {
    logError('Error processing manual message', error);
    throw error;
  }
}

async function processAgentResponse(phoneNumber: string, message: string, agentResponse: AgentResponse): Promise<void> {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Send SMS via AWS End User Messaging
    const smsResult = await SMSService.sendSMS(normalizedPhone, message);

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

    await updateCampaignMetrics(agentResponse.campaign_id, normalizedPhone, agentResponse);

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

async function updateCampaignMetrics(
  campaignId: string,
  phoneNumber: string,
  agentResponse: AgentResponse
): Promise<void> {
  const campaignCustomer = await CampaignCustomerModel.findByCampaignAndPhone(agentResponse.campaign_id, phoneNumber);
  if (!campaignCustomer) {
    logWarn('Campaign customer not found', {
      campaignId: agentResponse.campaign_id,
      phoneNumber: phoneNumber,
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
