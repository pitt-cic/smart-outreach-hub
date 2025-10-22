import { dynamoDBDocumentClient, getTableName } from '../client';
import { CreateDbCustomer, CustomerStatus, DbCustomer, UpdateDbCustomer } from '../types';

import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logError } from '../../log-utils';

export class CustomerModel {
  static async create(customer: CreateDbCustomer): Promise<DbCustomer> {
    const now = new Date().toISOString();
    const customerItem: DbCustomer = {
      ...customer,
      created_at: now,
      updated_at: now,
    };

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: getTableName('customers'),
        Item: customerItem,
      })
    );

    return customerItem;
  }

  static async findByPhoneNumber(phoneNumber: string): Promise<DbCustomer | null> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new GetCommand({
          TableName: getTableName('customers'),
          Key: { phone_number: phoneNumber },
        })
      );

      return result.Item as DbCustomer | null;
    } catch (error) {
      logError('Error finding customer by phone number:', error);
      return null;
    }
  }

  static async findAll(): Promise<DbCustomer[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('customers'),
        })
      );

      return (result.Items as DbCustomer[]) || [];
    } catch (error) {
      logError('Error finding all customers:', error);
      return [];
    }
  }

  static async findByStatus(status: CustomerStatus): Promise<DbCustomer[]> {
    try {
      const result = await dynamoDBDocumentClient.send(
        new ScanCommand({
          TableName: getTableName('customers'),
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': status,
          },
        })
      );

      return (result.Items as DbCustomer[]) || [];
    } catch (error) {
      logError('Error finding customers by status:', error);
      return [];
    }
  }

  static async update(phoneNumber: string, updates: UpdateDbCustomer): Promise<DbCustomer | null> {
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
      await dynamoDBDocumentClient.send(
        new UpdateCommand({
          TableName: getTableName('customers'),
          Key: { phone_number: phoneNumber },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );

      return await this.findByPhoneNumber(phoneNumber);
    } catch (error) {
      logError('Error updating customer:', error);
      return null;
    }
  }

  static async delete(phoneNumber: string): Promise<boolean> {
    try {
      await dynamoDBDocumentClient.send(
        new DeleteCommand({
          TableName: getTableName('customers'),
          Key: { phone_number: phoneNumber },
        })
      );

      return true;
    } catch (error) {
      logError('Error deleting customer:', error);
      return false;
    }
  }

  static async bulkCreate(customers: CreateDbCustomer[]): Promise<DbCustomer[]> {
    const results: DbCustomer[] = [];

    // DynamoDB doesn't have bulk insert, so we'll use individual PutCommands
    // For better performance, you could use BatchWriteCommand
    for (const customer of customers) {
      try {
        const result = await this.create(customer);
        results.push(result);
      } catch (error) {
        logError(`Error creating customer ${customer.phone_number}:`, error);
      }
    }

    return results;
  }
}
