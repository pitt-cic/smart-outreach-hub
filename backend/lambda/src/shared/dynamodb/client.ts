import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLES = {
  customers: process.env.DYNAMODB_CUSTOMER_TABLE || 'outreach-customers',
  campaigns: process.env.DYNAMODB_CAMPAIGN_TABLE || 'outreach-campaigns',
  chatHistory: process.env.DYNAMODB_CHAT_TABLE || 'outreach-chat-history',
  campaignCustomers: process.env.DYNAMODB_CAMPAIGN_CUSTOMER_TABLE || 'outreach-campaign-customers',
};

export function getTableName(tableKey: keyof typeof TABLES): string {
    return TABLES[tableKey];
}
