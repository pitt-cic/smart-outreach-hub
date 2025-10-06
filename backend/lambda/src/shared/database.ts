import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import {v4 as uuidv4} from 'uuid';
import {
    DbCampaign,
    DbChatMessage,
    DbCustomer,
    DbCampaignCustomer,
    CampaignCustomerStatus,
    UserSentiment,
    CampaignMetrics
} from './types';
import { logInfo } from './utils';

let dynamoDbClient: DynamoDBDocumentClient | null = null;
let tableNames: { customers: string; campaigns: string; chatHistory: string; campaignCustomers: string } | null = null;

// Initialize DynamoDB client for Lambda
export function initializeDatabase(): DynamoDBDocumentClient {
    if (dynamoDbClient && tableNames) {
        return dynamoDbClient;
    }

    // Create DynamoDB client
    const client = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });

    dynamoDbClient = DynamoDBDocumentClient.from(client);

    // Initialize table names from environment variables
    tableNames = {
        customers: process.env.DYNAMODB_CUSTOMER_TABLE || 'outreach-customers',
        campaigns: process.env.DYNAMODB_CAMPAIGN_TABLE || 'outreach-campaigns',
        chatHistory: process.env.DYNAMODB_CHAT_TABLE || 'outreach-chat-history',
        campaignCustomers: process.env.DYNAMODB_CAMPAIGN_CUSTOMER_TABLE || 'outreach-campaign-customers',
    };

    console.log('DynamoDB client initialized with tables:', tableNames);
    return dynamoDbClient;
}

// Helper function to get table names
function getTableNames() {
    if (!tableNames) {
        throw new Error('Database not initialized');
    }
    return tableNames;
}

// Customer operations
export class CustomerModel {
    static async create(customer: Omit<DbCustomer, 'created_at' | 'updated_at'>): Promise<DbCustomer> {
        const client = initializeDatabase();
        const tables = getTableNames();

        const now = new Date().toISOString();
        const customerItem: DbCustomer = {
            ...customer,
            created_at: now,
            updated_at: now,
        };

        await client.send(new PutCommand({
            TableName: tables.customers,
            Item: customerItem,
        }));

        return customerItem;
    }

    static async findByPhoneNumber(phoneNumber: string): Promise<DbCustomer | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new GetCommand({
                TableName: tables.customers,
                Key: {phone_number: phoneNumber},
            }));

            return result.Item as DbCustomer | null;
        } catch (error) {
            console.error('Error finding customer by phone number:', error);
            return null;
        }
    }

    static async findAll(): Promise<DbCustomer[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new ScanCommand({
                TableName: tables.customers,
            }));

            return (result.Items as DbCustomer[]) || [];
        } catch (error) {
            console.error('Error finding all customers:', error);
            return [];
        }
    }

    static async findByStatus(status: DbCustomer['status']): Promise<DbCustomer[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new ScanCommand({
                TableName: tables.customers,
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':status': status,
                },
            }));

            return (result.Items as DbCustomer[]) || [];
        } catch (error) {
            console.error('Error finding customers by status:', error);
            return [];
        }
    }

    static async update(phoneNumber: string, updates: Partial<Omit<DbCustomer, 'phone_number' | 'created_at'>>): Promise<DbCustomer | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        // Add updated_at timestamp
        const updatesWithTimestamp = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        // Build update expression
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.keys(updatesWithTimestamp).forEach((key, index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = updatesWithTimestamp[key as keyof typeof updatesWithTimestamp];
        });

        try {
            await client.send(new UpdateCommand({
                TableName: tables.customers,
                Key: {phone_number: phoneNumber},
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }));

            return await this.findByPhoneNumber(phoneNumber);
        } catch (error) {
            console.error('Error updating customer:', error);
            return null;
        }
    }

    static async delete(phoneNumber: string): Promise<boolean> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new DeleteCommand({
                TableName: tables.customers,
                Key: {phone_number: phoneNumber},
            }));

            return true;
        } catch (error) {
            console.error('Error deleting customer:', error);
            return false;
        }
    }

    static async bulkCreate(customers: Omit<DbCustomer, 'created_at' | 'updated_at'>[]): Promise<DbCustomer[]> {
        const results: DbCustomer[] = [];

        // DynamoDB doesn't have bulk insert, so we'll use individual PutCommands
        // For better performance, you could use BatchWriteCommand
        for (const customer of customers) {
            try {
                const result = await this.create(customer);
                results.push(result);
            } catch (error) {
                console.error(`Error creating customer ${customer.phone_number}:`, error);
            }
        }

        return results;
    }
}

// Campaign operations
export class CampaignModel {
    static async create(campaign: Omit<DbCampaign, 'campaign_id' | 'created_at'>): Promise<DbCampaign> {
        const client = initializeDatabase();
        const tables = getTableNames();

        const campaignId = uuidv4();
        const now = new Date().toISOString();
        const campaignItem: DbCampaign = {
            ...campaign,
            campaign_id: campaignId,
            created_at: now,
        };

        await client.send(new PutCommand({
            TableName: tables.campaigns,
            Item: campaignItem,
        }));

        return campaignItem;
    }

    static async findById(campaignId: string): Promise<DbCampaign | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new GetCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
            }));

            return result.Item as DbCampaign | null;
        } catch (error) {
            console.error('Error finding campaign by ID:', error);
            return null;
        }
    }

    static async findAll(): Promise<DbCampaign[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new ScanCommand({
                TableName: tables.campaigns,
            }));

            return (result.Items as DbCampaign[]) || [];
        } catch (error) {
            console.error('Error finding all campaigns:', error);
            return [];
        }
    }

    static async update(campaignId: string, updates: Partial<Omit<DbCampaign, 'campaign_id' | 'created_at'>>): Promise<DbCampaign | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        // Build update expression
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.keys(updates).forEach((key, index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpressions.push(`${attrName} = ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = updates[key as keyof typeof updates];
        });

        try {
            await client.send(new UpdateCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }));

            return await this.findById(campaignId);
        } catch (error) {
            console.error('Error updating campaign:', error);
            return null;
        }
    }

    static async updateCampaignMetrics(campaignId: string, metrics: CampaignMetrics): Promise<void> {
        const client = initializeDatabase();
        const tables = getTableNames();

        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        Object.keys(metrics).forEach((key, index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpressions.push(`${attrName} ${attrValue}`);
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = metrics[key as keyof CampaignMetrics];
        });
        logInfo(`Updating campaign metrics. Expression: ${updateExpressions.join(', ')}`, {
            expressionAttributeNames: expressionAttributeNames,
            expressionAttributeValues: expressionAttributeValues,
        });

        try {
            await client.send(new UpdateCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
                UpdateExpression: `ADD ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }));
        } catch (error) {
            console.error('Error updating campaign metrics:', error);
        }
    }

    static async delete(campaignId: string): Promise<boolean> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new DeleteCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
            }));

            return true;
        } catch (error) {
            console.error('Error deleting campaign:', error);
            return false;
        }
    }

    static async incrementSentCount(campaignId: string): Promise<void> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new UpdateCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
                UpdateExpression: 'ADD sent_count :increment',
                ExpressionAttributeValues: {
                    ':increment': 1,
                },
            }));
        } catch (error) {
            console.error('Error incrementing sent count:', error);
        }
    }

    static async incrementResponseCount(campaignId: string): Promise<void> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new UpdateCommand({
                TableName: tables.campaigns,
                Key: {campaign_id: campaignId},
                UpdateExpression: 'ADD response_count :increment',
                ExpressionAttributeValues: {
                    ':increment': 1,
                },
            }));
        } catch (error) {
            console.error('Error incrementing response count:', error);
        }
    }
}

// Chat message operations
export class ChatMessageModel {
    static async create(message: Omit<DbChatMessage, 'id' | 'timestamp'>): Promise<DbChatMessage> {
        const client = initializeDatabase();
        const tables = getTableNames();

        const messageId = uuidv4();
        const now = new Date().toISOString();
        const messageItem: DbChatMessage = {
            ...message,
            id: messageId,
            timestamp: now,
        };

        await client.send(new PutCommand({
            TableName: tables.chatHistory,
            Item: messageItem,
        }));

        return messageItem;
    }

    static async findById(messageId: string): Promise<DbChatMessage | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new GetCommand({
                TableName: tables.chatHistory,
                Key: {id: messageId},
            }));

            return result.Item as DbChatMessage | null;
        } catch (error) {
            console.error('Error finding chat message by ID:', error);
            return null;
        }
    }

    static async findByPhoneNumber(phoneNumber: string): Promise<DbChatMessage[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new QueryCommand({
                TableName: tables.chatHistory,
                IndexName: 'phone_number-timestamp-index',
                KeyConditionExpression: 'phone_number = :phoneNumber',
                ExpressionAttributeValues: {
                    ':phoneNumber': phoneNumber,
                },
                ScanIndexForward: true, // Sort by timestamp ascending
            }));

            return (result.Items as DbChatMessage[]) || [];
        } catch (error) {
            console.error('Error finding chat messages by phone number:', error);
            return [];
        }
    }

    static async findByCampaign(campaignId: string): Promise<DbChatMessage[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new ScanCommand({
                TableName: tables.chatHistory,
                FilterExpression: 'campaign_id = :campaignId',
                ExpressionAttributeValues: {
                    ':campaignId': campaignId,
                },
            }));

            // Sort by timestamp descending manually since DynamoDB scan doesn't guarantee order
            const messages = (result.Items as DbChatMessage[]) || [];
            return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error('Error finding chat messages by campaign:', error);
            return [];
        }
    }

    static async findAll(limit?: number): Promise<DbChatMessage[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new ScanCommand({
                TableName: tables.chatHistory,
                Limit: limit,
            }));

            // Sort by timestamp descending manually since DynamoDB scan doesn't guarantee order
            const messages = (result.Items as DbChatMessage[]) || [];
            return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error('Error finding all chat messages:', error);
            return [];
        }
    }

    static async delete(messageId: string): Promise<boolean> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new DeleteCommand({
                TableName: tables.chatHistory,
                Key: {id: messageId},
            }));

            return true;
        } catch (error) {
            console.error('Error deleting chat message:', error);
            return false;
        }
    }
}

// Campaign Customer operations
export class CampaignCustomerModel {
    static async create(campaignCustomer: Omit<DbCampaignCustomer, 'created_at' | 'updated_at'>): Promise<DbCampaignCustomer> {
        const client = initializeDatabase();
        const tables = getTableNames();

        const now = new Date().toISOString();
        const campaignCustomerItem: DbCampaignCustomer = {
            ...campaignCustomer,
            created_at: now,
            updated_at: now,
        };

        await client.send(new PutCommand({
            TableName: tables.campaignCustomers,
            Item: campaignCustomerItem,
        }));

        return campaignCustomerItem;
    }

    static async findByCampaignId(campaignId: string): Promise<DbCampaignCustomer[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new QueryCommand({
                TableName: tables.campaignCustomers,
                KeyConditionExpression: 'campaign_id = :campaignId',
                ExpressionAttributeValues: {
                    ':campaignId': campaignId,
                },
            }));

            return (result.Items as DbCampaignCustomer[]) || [];
        } catch (error) {
            console.error('Error finding campaign customers by campaign ID:', error);
            return [];
        }
    }

    static async findByPhoneNumber(phoneNumber: string): Promise<DbCampaignCustomer[]> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new QueryCommand({
                TableName: tables.campaignCustomers,
                IndexName: 'phone_number-campaign_id-index',
                KeyConditionExpression: 'phone_number = :phoneNumber',
                ExpressionAttributeValues: {
                    ':phoneNumber': phoneNumber,
                },
            }));

            return (result.Items as DbCampaignCustomer[]) || [];
        } catch (error) {
            console.error('Error finding campaign customers by phone number:', error);
            return [];
        }
    }

    static async findByCampaignAndPhone(campaignId: string, phoneNumber: string): Promise<DbCampaignCustomer | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new GetCommand({
                TableName: tables.campaignCustomers,
                Key: {
                    campaign_id: campaignId,
                    phone_number: phoneNumber,
                },
            }));

            return result.Item as DbCampaignCustomer | null;
        } catch (error) {
            console.error('Error finding campaign customer by campaign ID and phone number:', error);
            return null;
        }
    }

    static async updateStatus(campaignId: string, phoneNumber: string, status: CampaignCustomerStatus): Promise<DbCampaignCustomer | null> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new UpdateCommand({
                TableName: tables.campaignCustomers,
                Key: {
                    campaign_id: campaignId,
                    phone_number: phoneNumber,
                },
                UpdateExpression: 'SET #status = :status, updated_at = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':status': status,
                    ':updatedAt': new Date().toISOString(),
                },
            }));

            return await this.findByCampaignAndPhone(campaignId, phoneNumber);
        } catch (error) {
            console.error('Error updating campaign customer status:', error);
            return null;
        }
    }

    static async bulkCreate(campaignCustomers: Omit<DbCampaignCustomer, 'created_at' | 'updated_at'>[]): Promise<DbCampaignCustomer[]> {
        const results: DbCampaignCustomer[] = [];

        // DynamoDB doesn't have bulk insert, so we'll use individual PutCommands
        // For better performance, you could use BatchWriteCommand
        for (const campaignCustomer of campaignCustomers) {
            try {
                const result = await this.create(campaignCustomer);
                results.push(result);
            } catch (error) {
                console.error(`Error creating campaign customer ${campaignCustomer.campaign_id}:${campaignCustomer.phone_number}:`, error);
            }
        }

        return results;
    }

    static async countByCampaignId(campaignId: string): Promise<number> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            const result = await client.send(new QueryCommand({
                TableName: tables.campaignCustomers,
                KeyConditionExpression: 'campaign_id = :campaignId',
                ExpressionAttributeValues: {
                    ':campaignId': campaignId,
                },
                Select: 'COUNT',
            }));

            return result.Count || 0;
        } catch (error) {
            console.error('Error counting campaign customers by campaign ID:', error);
            return 0;
        }
    }

    static async delete(campaignId: string, phoneNumber: string): Promise<boolean> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            await client.send(new DeleteCommand({
                TableName: tables.campaignCustomers,
                Key: {
                    campaign_id: campaignId,
                    phone_number: phoneNumber,
                },
            }));

            return true;
        } catch (error) {
            console.error('Error deleting campaign customer:', error);
            return false;
        }
    }
}

// Utility functions
export class DatabaseUtils {
    static async getStats() {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            // Get counts from all tables
            const [customersResult, campaignsResult, messagesResult, needsResponseResult] = await Promise.all([
                client.send(new ScanCommand({
                    TableName: tables.customers,
                    Select: 'COUNT',
                })),
                client.send(new ScanCommand({
                    TableName: tables.campaigns,
                    Select: 'COUNT',
                })),
                client.send(new ScanCommand({
                    TableName: tables.chatHistory,
                    Select: 'COUNT',
                })),
                client.send(new ScanCommand({
                    TableName: tables.customers,
                    FilterExpression: '#status = :status',
                    ExpressionAttributeNames: {
                        '#status': 'status',
                    },
                    ExpressionAttributeValues: {
                        ':status': 'needs_response',
                    },
                    Select: 'COUNT',
                })),
            ]);

            return {
                customers: customersResult.Count || 0,
                campaigns: campaignsResult.Count || 0,
                messages: messagesResult.Count || 0,
                needsResponse: needsResponseResult.Count || 0,
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return {
                customers: 0,
                campaigns: 0,
                messages: 0,
                needsResponse: 0,
            };
        }
    }

    static async clearAllData(): Promise<void> {
        const client = initializeDatabase();
        const tables = getTableNames();

        try {
            // Get all items from each table and delete them
            // Note: This is not efficient for large datasets, but works for testing

            // Clear chat history
            const chatResult = await client.send(new ScanCommand({
                TableName: tables.chatHistory,
                ProjectionExpression: 'id',
            }));

            if (chatResult.Items) {
                for (const item of chatResult.Items) {
                    await client.send(new DeleteCommand({
                        TableName: tables.chatHistory,
                        Key: {id: item.id},
                    }));
                }
            }

            // Clear customers
            const customerResult = await client.send(new ScanCommand({
                TableName: tables.customers,
                ProjectionExpression: 'phone_number',
            }));

            if (customerResult.Items) {
                for (const item of customerResult.Items) {
                    await client.send(new DeleteCommand({
                        TableName: tables.customers,
                        Key: {phone_number: item.phone_number},
                    }));
                }
            }

            // Clear campaigns
            const campaignResult = await client.send(new ScanCommand({
                TableName: tables.campaigns,
                ProjectionExpression: 'campaign_id',
            }));

            if (campaignResult.Items) {
                for (const item of campaignResult.Items) {
                    await client.send(new DeleteCommand({
                        TableName: tables.campaigns,
                        Key: {campaign_id: item.campaign_id},
                    }));
                }
            }

            // Clear campaign customers
            const campaignCustomerResult = await client.send(new ScanCommand({
                TableName: tables.campaignCustomers,
                ProjectionExpression: 'campaign_id, phone_number',
            }));

            if (campaignCustomerResult.Items) {
                for (const item of campaignCustomerResult.Items) {
                    await client.send(new DeleteCommand({
                        TableName: tables.campaignCustomers,
                        Key: {
                            campaign_id: item.campaign_id,
                            phone_number: item.phone_number
                        },
                    }));
                }
            }

            console.log('All database data cleared successfully');
        } catch (error) {
            console.error('Error clearing database data:', error);
            throw error;
        }
    }
}