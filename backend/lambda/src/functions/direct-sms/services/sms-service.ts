import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { logError, logInfo } from '../../../shared/log-utils';
import { SMSResult } from '../types';
import { maskPhoneNumber } from '../../../shared/utils';

const pinpointClient = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION });

export class SMSService {
  static async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    try {
      if (!process.env.ORIGINATION_IDENTITY) {
        throw new Error('ORIGINATION_IDENTITY environment variable not set');
      }

      logInfo('Sending SMS via End User Messaging', {
        phoneNumber: maskPhoneNumber(phoneNumber),
        messageLength: message.length,
      });

      const result = await pinpointClient.send(
        new SendTextMessageCommand({
          DestinationPhoneNumber: phoneNumber,
          OriginationIdentity: process.env.ORIGINATION_IDENTITY,
          MessageBody: message,
          MessageType: 'PROMOTIONAL',
        })
      );

      logInfo('SMS sent successfully', {
        phoneNumber: maskPhoneNumber(phoneNumber),
        messageId: result.MessageId,
      });

      return { success: true, messageId: result.MessageId, status: 'sent' };
    } catch (error: any) {
      const errorDetails = {
        error: error.message || 'Unknown error',
        errorCode: error.name,
        errorDetails: error,
      };

      logError('Failed to send SMS', {
        phoneNumber: maskPhoneNumber(phoneNumber),
        ...errorDetails,
      });

      return { success: false, status: 'failed', ...errorDetails };
    }
  }
}
