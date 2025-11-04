import { dynamoDBDocumentClient, getTableName } from '../client';

import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid4 } from 'uuid';
import { logError } from '../../log-utils';
import { CampaignMetrics, CreateDbCampaign, DbCampaign, UpdateDbCampaign } from '../types';

export class CampaignModel {
  static async create(campaign: CreateDbCampaign): Promise<DbCampaign> {
    const campaignId = uuid4();
    const now = new Date().toISOString();
    const campaignItem: DbCampaign = {
      ...campaign,
      campaign_id: campaignId,
      created_at: now,
      updated_at: now,
    };

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: getTableName('campaigns'),
        Item: campaignItem,
      })
    );

    return campaignItem;
  }

  static async findById(campaignId: string): Promise<DbCampaign | null> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new GetCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
        })
      );

      return result.Item as DbCampaign | null;
    } catch (error) {
      logError('Error finding campaign by ID:', error);
      return null;
    }
  }

  static async findAll(): Promise<DbCampaign[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('campaigns'),
        })
      );

      return (result.Items as DbCampaign[]) || [];
    } catch (error) {
      logError('Error finding all campaigns:', error);
      return [];
    }
  }

  static async update(campaignId: string, updates: UpdateDbCampaign): Promise<DbCampaign | null> {
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
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );

      return await this.findById(campaignId);
    } catch (error) {
      logError('Error updating campaign:', error);
      return null;
    }
  }

  static async updateCampaignMetrics(campaignId: string, metrics: CampaignMetrics): Promise<void> {
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

    try {
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
          UpdateExpression: `ADD ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
    } catch (error) {
      logError('Error updating campaign metrics:', error);
    }
  }

  static async delete(campaignId: string): Promise<boolean> {
    try {
      await dynamoDBDocumentClient.send(
        new DeleteCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
        })
      );

      return true;
    } catch (error) {
      logError('Error deleting campaign:', error);
      return false;
    }
  }

  static async incrementSentCount(campaignId: string): Promise<void> {
    try {
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
          UpdateExpression: 'ADD sent_count :increment',
          ExpressionAttributeValues: {
            ':increment': 1,
          },
        })
      );
    } catch (error) {
      logError('Error incrementing sent count:', error);
    }
  }

  static async incrementResponseCount(campaignId: string): Promise<void> {
    try {
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('campaigns'),
          Key: { campaign_id: campaignId },
          UpdateExpression: 'ADD response_count :increment',
          ExpressionAttributeValues: {
            ':increment': 1,
          },
        })
      );
    } catch (error) {
      logError('Error incrementing response count:', error);
    }
  }
}
