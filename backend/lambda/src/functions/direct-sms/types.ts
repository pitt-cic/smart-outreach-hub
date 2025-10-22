import { UserSentiment } from '../../shared/types';

export interface HandleSQSEventResult {
  itemIdentifier: string;
  success: boolean;
  error?: string;
}

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

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'failed';
}
