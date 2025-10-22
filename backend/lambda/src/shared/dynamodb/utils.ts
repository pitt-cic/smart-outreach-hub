import { dynamoDBDocumentClient, getTableName } from './client';

import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logError, logInfo } from '../log-utils';

export class DatabaseUtils {
  static async clearAllData(): Promise<void> {
    try {
      // Get all items from each table and delete them
      // Note: This is not efficient for large datasets, but works for testing

      // Clear chat history
      const chatResult = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('chatHistory'),
          ProjectionExpression: 'id',
        })
      );

      if (chatResult.Items) {
        for (const item of chatResult.Items) {
          await dynamoDBDocumentClient.send(
            new DeleteCommand({
              TableName: getTableName('chatHistory'),
              Key: { id: item.id },
            })
          );
        }
      }

      // Clear customers
      const customerResult = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('customers'),
          ProjectionExpression: 'phone_number',
        })
      );

      if (customerResult.Items) {
        for (const item of customerResult.Items) {
          await dynamoDBDocumentClient.send(
            new DeleteCommand({
              TableName: getTableName('customers'),
              Key: { phone_number: item.phone_number },
            })
          );
        }
      }

      // Clear campaigns
      const campaignResult = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('campaigns'),
          ProjectionExpression: 'campaign_id',
        })
      );

      if (campaignResult.Items) {
        for (const item of campaignResult.Items) {
          await dynamoDBDocumentClient.send(
            new DeleteCommand({
              TableName: getTableName('campaigns'),
              Key: { campaign_id: item.campaign_id },
            })
          );
        }
      }

      // Clear campaign customers
      const campaignCustomerResult = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('campaignCustomers'),
          ProjectionExpression: 'campaign_id, phone_number',
        })
      );

      if (campaignCustomerResult.Items) {
        for (const item of campaignCustomerResult.Items) {
          await dynamoDBDocumentClient.send(
            new DeleteCommand({
              TableName: getTableName('campaignCustomers'),
              Key: {
                campaign_id: item.campaign_id,
                phone_number: item.phone_number,
              },
            })
          );
        }
      }

      logInfo('All database data cleared successfully');
    } catch (error) {
      logError('Error clearing database data:', error);
      throw error;
    }
  }
}
