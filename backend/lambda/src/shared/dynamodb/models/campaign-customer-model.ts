import { dynamoDBDocumentClient, getTableName } from '../client';

import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logError } from '../../log-utils';
import { CampaignCustomerStatus, CreateDbCampaignCustomer, DbCampaignCustomer } from '../types';

export class CampaignCustomerModel {
  static async create(campaignCustomer: CreateDbCampaignCustomer): Promise<DbCampaignCustomer> {
    const now = new Date().toISOString();
    const campaignCustomerItem: DbCampaignCustomer = {
      ...campaignCustomer,
      created_at: now,
      updated_at: now,
    };

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: getTableName('campaignCustomers'),
        Item: campaignCustomerItem,
      })
    );

    return campaignCustomerItem;
  }

  static async findByCampaignId(campaignId: string): Promise<DbCampaignCustomer[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: getTableName('campaignCustomers'),
          KeyConditionExpression: 'campaign_id = :campaignId',
          ExpressionAttributeValues: {
            ':campaignId': campaignId,
          },
        })
      );

      return (result.Items as DbCampaignCustomer[]) || [];
    } catch (error) {
      logError('Error finding campaign customers by campaign ID:', error);
      return [];
    }
  }

  static async findByPhoneNumber(phoneNumber: string): Promise<DbCampaignCustomer[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: getTableName('campaignCustomers'),
          IndexName: 'phone_number-campaign_id-index',
          KeyConditionExpression: 'phone_number = :phoneNumber',
          ExpressionAttributeValues: {
            ':phoneNumber': phoneNumber,
          },
        })
      );

      return (result.Items as DbCampaignCustomer[]) || [];
    } catch (error) {
      logError('Error finding campaign customers by phone number:', error);
      return [];
    }
  }

  static async findByCampaignAndPhone(campaignId: string, phoneNumber: string): Promise<DbCampaignCustomer | null> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new GetCommand({
          TableName: getTableName('campaignCustomers'),
          Key: {
            campaign_id: campaignId,
            phone_number: phoneNumber,
          },
        })
      );

      return result.Item as DbCampaignCustomer | null;
    } catch (error) {
      logError('Error finding campaign customer by campaign ID and phone number:', error);
      return null;
    }
  }

  static async updateStatus(
    campaignId: string,
    phoneNumber: string,
    status: CampaignCustomerStatus
  ): Promise<DbCampaignCustomer | null> {
    try {
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('campaignCustomers'),
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
        })
      );

      return await this.findByCampaignAndPhone(campaignId, phoneNumber);
    } catch (error) {
      logError('Error updating campaign customer status:', error);
      return null;
    }
  }

  static async bulkCreate(campaignCustomers: CreateDbCampaignCustomer[]): Promise<DbCampaignCustomer[]> {
    const results: DbCampaignCustomer[] = [];

    // DynamoDB doesn't have bulk insert, so we'll use individual PutCommands
    // For better performance, you could use BatchWriteCommand
    for (const campaignCustomer of campaignCustomers) {
      try {
        const result = await this.create(campaignCustomer);
        results.push(result);
      } catch (error) {
        logError(
          `Error creating campaign customer ${campaignCustomer.campaign_id}:${campaignCustomer.phone_number}:`,
          error
        );
      }
    }

    return results;
  }

  static async countByCampaignId(campaignId: string): Promise<number> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new QueryCommand({
          TableName: getTableName('campaignCustomers'),
          KeyConditionExpression: 'campaign_id = :campaignId',
          ExpressionAttributeValues: {
            ':campaignId': campaignId,
          },
          Select: 'COUNT',
        })
      );

      return result.Count || 0;
    } catch (error) {
      logError('Error counting campaign customers by campaign ID:', error);
      return 0;
    }
  }

  static async delete(campaignId: string, phoneNumber: string): Promise<boolean> {
    try {
      await dynamoDBDocumentClient.send(
        new DeleteCommand({
          TableName: getTableName('campaignCustomers'),
          Key: {
            campaign_id: campaignId,
            phone_number: phoneNumber,
          },
        })
      );

      return true;
    } catch (error) {
      logError('Error deleting campaign customer:', error);
      return false;
    }
  }
}
