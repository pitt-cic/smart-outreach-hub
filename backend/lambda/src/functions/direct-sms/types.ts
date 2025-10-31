import { UserSentiment } from '../../shared/types';

export interface AgentResponse {
  response_text: string;
  should_handoff: boolean;
  handoff_reason?: string;
  user_sentiment?: UserSentiment;
  guardrails_intervened: boolean;
  campaign_id: string;
}

export interface CampaignMessage {
  phoneNumber: string;
  message: string;
  campaignId: string;
  customerId: string;
  messageType: 'campaign';
}

export interface ManualMessage {
  phoneNumber: string;
  message: string;
  messageType: 'manual';
  messageId?: string;
}

export interface SQSMessageBody {
  phoneNumber?: string;
  agentResponse?: AgentResponse;
  message?: string;
  campaignId?: string;
  customerId?: string;
  messageType?: 'campaign' | 'manual';
  timestamp?: number;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'failed';
}
