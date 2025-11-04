export interface InboundSMSMessage {
    fromPhoneNumber: string;
    toPhoneNumber: string;
    messageBody: string;
    messageId: string;
    timestamp?: string;
}

export interface SNSMessage {
    Type: string;
    MessageId: string;
    TopicArn: string;
    Subject?: string;
    Message: string;
    Timestamp: string;
}
