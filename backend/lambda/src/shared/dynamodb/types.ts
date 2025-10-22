/**
 * SHARED DYNAMODB MODELS AND TYPES
 * =============================================================================
 */
type TimestampMetadataKeys = 'created_at' | 'updated_at';

/**
 * CUSTOMER MODEL AND TYPES
 * =============================================================================
 */
export type CustomerStatus = 'automated' | 'needs_response' | 'agent_responding';

export interface DbCustomer {
  phone_number: string;
  first_name: string;
  last_name: string;
  most_recent_campaign_id?: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export type CreateDbCustomer = Omit<DbCustomer, TimestampMetadataKeys>;
export type UpdateDbCustomer = Partial<Omit<DbCustomer, 'phone_number' | 'created_at'>>;

/**
 * CAMPAIGN MODEL AND TYPES
 * =============================================================================
 */
export type CampaignStatus = 'draft' | 'ready' | 'sending' | 'sending_personalized' | 'sent' | 'completed';

export interface CampaignMetrics {
  response_count?: number; // Total number of responses to the campaign
  positive_handoff_count?: number; // Total number of positive handoffs to the campaign
  neutral_handoff_count?: number; // Total number of neutral handoffs to the campaign
  negative_handoff_count?: number; // Total number of negative handoffs to the campaign
  positive_response_count?: number; // Total number of positive responses to the campaign
  neutral_response_count?: number; // Total number of neutral responses to the campaign
  negative_response_count?: number; // Total number of negative responses to the campaign
  first_response_positive_count?: number; // Total number of first responses that were positive
  first_response_neutral_count?: number; // Total number of first responses that were neutral
  first_response_negative_count?: number; // Total number of first responses that were negative
}

export interface DbCampaign extends CampaignMetrics {
  campaign_id: string;
  name: string;
  message_template: string;
  campaign_details?: string;
  total_contacts: number;
  sent_count: number;
  status?: CampaignStatus;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export type CreateDbCampaign = Omit<DbCampaign, 'campaign_id' | TimestampMetadataKeys>;
export type UpdateDbCampaign = Partial<Omit<DbCampaign, 'campaign_id' | 'created_at'>>;

/**
 * CHAT MESSAGE MODEL AND TYPES
 * =============================================================================
 */
export type UserSentiment = 'positive' | 'neutral' | 'negative';
export type ChatMessageDirection = 'outbound' | 'inbound';
export type ChatMessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type ChatMessageResponseType = 'automated' | 'manual' | 'ai_agent';

export interface DbChatMessage {
  id: string;
  phone_number: string;
  message: string;
  direction: ChatMessageDirection;
  timestamp: string;
  sent_at?: string;
  response_type?: ChatMessageResponseType;
  campaign_id?: string;
  status?: ChatMessageStatus;
  should_handoff?: boolean;
  handoff_reason?: string;
  user_sentiment?: UserSentiment;
  external_message_id?: string;
  error_message?: string;
}

export type CreateDbChatMessage = Omit<DbChatMessage, 'id' | 'timestamp'>;

/**
 * CAMPAIGN CUSTOMER MODEL AND TYPES
 * =============================================================================
 */
export type CampaignCustomerStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'processed';

export interface DbCampaignCustomer {
  campaign_id: string;
  phone_number: string;
  status: CampaignCustomerStatus;
  created_at: string;
  updated_at: string;
}

export type CreateDbCampaignCustomer = Omit<DbCampaignCustomer, TimestampMetadataKeys>;
