export interface LambdaHandlerResult {
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
}

export interface HandleSQSEventResult {
  itemIdentifier: string;
  success: boolean;
  error?: string;
}

export type CustomerStatus = 'automated' | 'needs_response' | 'agent_responding';
export type MessageDirection = 'outbound' | 'inbound';
export type ResponseType = 'automated' | 'manual' | "ai_agent";
export type CampaignCustomerStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'processed';
export type UserSentiment = 'positive' | 'neutral' | 'negative';

export interface Customer {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    mostRecentCampaignId?: string;
    status: CustomerStatus;
    createdAt: string;
    updatedAt: string;
    chatHistory?: ChatMessage[];
}

export interface ChatMessage {
    id: string;
    phoneNumber: string;
    campaignId?: string;
    message: string;
    direction: MessageDirection;
    timestamp: string;
    responseType?: ResponseType;
}

export interface Campaign {
    campaignId: string;
    name: string;
    messageTemplate: string;
    campaignDetails?: string;
    totalContacts: number;
    sentCount: number;
    responseCount: number;
    positiveHandoffCount: number;
    neutralHandoffCount: number;
    negativeHandoffCount: number;
    positiveResponseCount: number;
    neutralResponseCount: number;
    negativeResponseCount: number;
    positiveResponseRate: number;
    neutralResponseRate: number;
    negativeResponseRate: number;
    firstResponsePositiveCount: number;
    firstResponseNeutralCount: number;
    firstResponseNegativeCount: number;
    createdAt: string;
}

export interface ContactInput {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

export interface CreateCampaignInput {
    name: string;
    messageTemplate: string;
    campaignDetails?: string;
}

export interface SendCampaignInput {
    campaignId: string;
}

export interface SendManualMessageInput {
    phoneNumber: string;
    message: string;
}

export interface UpdateCustomerStatusInput {
    phoneNumber: string;
    status: CustomerStatus;
}

// GraphQL Response Types
export interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{
        message: string;
        locations?: Array<{
            line: number;
            column: number;
        }>;
        path?: string[];
    }>;
}

// Database model types (matching SQLite structure)
export interface DbCustomer {
    phone_number: string;
    first_name: string;
    last_name: string;
    most_recent_campaign_id?: string;
    status: 'automated' | 'needs_response' | 'agent_responding';
    created_at: string;
    updated_at: string;
}

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
    sns_topic_arn?: string;
    total_contacts: number;
    sent_count: number;
    status?: 'draft' | 'ready' | 'sending' | 'sending_personalized' | 'sent' | 'completed';
    sent_at?: string;
    created_at: string;
    updated_at?: string;
}

export interface DbChatMessage {
    id: string;
    phone_number: string;
    campaign_id?: string;
    message: string;
    direction: 'outbound' | 'inbound';
    response_type?: 'automated' | 'manual' | 'ai_agent';
    should_handoff?: boolean;
    handoff_reason?: string;
    user_sentiment?: UserSentiment;
    timestamp: string;
    external_message_id?: string;
    status?: 'queued' | 'sent' | 'delivered' | 'failed';
    error_message?: string;
    sent_at?: string;
}

export interface DbCampaignCustomer {
    campaign_id: string;
    phone_number: string;
    status: CampaignCustomerStatus;
    created_at: string;
    updated_at: string;
}

// Error Types
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public field?: string) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, public dbCode?: string) {
        super(message, 'DATABASE_ERROR', 500);
        this.name = 'DatabaseError';
    }
}

export class AWSError extends AppError {
    constructor(message: string, public awsCode?: string) {
        super(message, 'AWS_ERROR', 500);
        this.name = 'AWSError';
    }
}
