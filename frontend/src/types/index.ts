export type CustomerStatus = 'automated' | 'needs_response' | 'agent_responding';
export type MessageDirection = 'outbound' | 'inbound';
export type ResponseType = 'automated' | 'manual' | 'ai_agent';

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
    positiveResponseCount: number;
    neutralResponseCount: number;
    negativeResponseCount: number;
    positiveResponseRate: number;
    neutralResponseRate: number;
    negativeResponseRate: number;
    positiveHandoffCount: number;
    neutralHandoffCount: number;
    negativeHandoffCount: number;
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

export interface UpdateCampaignInput {
    campaignId: string;
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

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// CSV Upload Types
export interface CSVRow {
    first_name: string;
    last_name: string;
    phone_number: string;
}

export interface UploadResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: string[];
}


// SMS Service Types (for future integration)
export interface SMSMessagePayload {
    phoneNumber: string;
    message: string;
    campaignId?: string;
    firstName?: string;
    lastName?: string;
}

export interface WebhookPayload {
    phoneNumber: string;
    message: string;
    timestamp: string;
    messageId?: string;
}

// Component Props Types
export interface CampaignFormProps {
    onSubmit: (campaign: CreateCampaignInput) => void;
    loading?: boolean;
}

export interface ContactUploadProps {
    campaignId: string;
    onUpload: (contacts: ContactInput[]) => void;
    loading?: boolean;
}

export interface CustomerListProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
    loading?: boolean;
}

export interface ChatInterfaceProps {
    customer: Customer;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    loading?: boolean;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

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
