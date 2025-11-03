import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DatabaseUtils } from '../../shared/dynamodb';
import { logError, logInfo } from '../../shared/log-utils';
import { createErrorResponse, createSuccessResponse } from '../../shared/utils';
import { handleContactUpload } from './utils';

// Main Lambda handler
export const handler = async (event: APIGatewayProxyEvent, _: Context): Promise<APIGatewayProxyResult> => {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
            },
            body: '',
        };
    }

    try {
        logInfo('Incoming campaigns request', { httpMethod: event.httpMethod, path: event.path });

        // Route based on path and method
        if (event.path.includes('/upload') && event.httpMethod === 'POST') {
            return await handleContactUpload(event);
        } else {
            return createErrorResponse('Not found', 404);
        }
    } catch (error) {
        logError('Campaigns Lambda error', error);

        return createErrorResponse(
            'Internal server error',
            500,
            process.env.NODE_ENV === 'development'
                ? {
                      error: error instanceof Error ? error.message : 'Unknown error',
                      stack: error instanceof Error ? error.stack : undefined,
                  }
                : undefined
        );
    }
};

// Health check handler
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
    try {
        await DatabaseUtils.checkConnectionToDynamoDB(['campaigns', 'customers', 'campaignCustomers']);

        return createSuccessResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'campaigns-lambda',
        });
    } catch (error) {
        logError('Health check failed', error);

        return createErrorResponse('Service unhealthy', 503, {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
};
