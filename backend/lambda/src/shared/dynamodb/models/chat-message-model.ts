import { dynamoDBDocumentClient, getTableName } from '../client';

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid4 } from 'uuid';
import { logError } from '../../log-utils';
import { CreateDbChatMessage, DbChatMessage } from '../types';

export class ChatMessageModel {
  static async create(message: CreateDbChatMessage): Promise<DbChatMessage> {
    const messageId = uuid4();
    const now = new Date().toISOString();
    const messageItem: DbChatMessage = {
      ...message,
      id: messageId,
      timestamp: now,
    };

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: getTableName('chatHistory'),
        Item: messageItem,
      })
    );

    return messageItem;
  }

  static async findById(messageId: string): Promise<DbChatMessage | null> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new GetCommand({
          TableName: getTableName('chatHistory'),
          Key: { id: messageId },
        })
      );

      return result.Item as DbChatMessage | null;
    } catch (error) {
      logError('Error finding chat message by ID:', error);
      return null;
    }
  }

  static async findByPhoneNumber(phoneNumber: string): Promise<DbChatMessage[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: getTableName('chatHistory'),
          IndexName: 'phone_number-timestamp-index',
          KeyConditionExpression: 'phone_number = :phoneNumber',
          ExpressionAttributeValues: {
            ':phoneNumber': phoneNumber,
          },
          ScanIndexForward: true, // Sort by timestamp ascending
        })
      );

      return (result.Items as DbChatMessage[]) || [];
    } catch (error) {
      logError('Error finding chat messages by phone number:', error);
      return [];
    }
  }

  static async findByCampaign(campaignId: string): Promise<DbChatMessage[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('chatHistory'),
          FilterExpression: 'campaign_id = :campaignId',
          ExpressionAttributeValues: {
            ':campaignId': campaignId,
          },
        })
      );

      // Sort by timestamp descending manually since DynamoDB scan doesn't guarantee order
      const messages = (result.Items as DbChatMessage[]) || [];
      return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logError('Error finding chat messages by campaign:', error);
      return [];
    }
  }

  static async findAll(limit?: number): Promise<DbChatMessage[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('chatHistory'),
          Limit: limit,
        })
      );

      // Sort by timestamp descending manually since DynamoDB scan doesn't guarantee order
      const messages = (result.Items as DbChatMessage[]) || [];
      return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logError('Error finding all chat messages:', error);
      return [];
    }
  }

  static async delete(messageId: string): Promise<boolean> {
    try {
      await dynamoDBDocumentClient.send(
        new DeleteCommand({
          TableName: getTableName('chatHistory'),
          Key: { id: messageId },
        })
      );

      return true;
    } catch (error) {
      logError('Error deleting chat message:', error);
      return false;
    }
  }
}
