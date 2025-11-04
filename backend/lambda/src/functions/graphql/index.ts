import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {createYoga} from 'graphql-yoga';
import {makeExecutableSchema} from '@graphql-tools/schema';
import * as utils from '../../shared/utils';
import {typeDefsString} from '../../graphql/schema';
import {resolvers} from '../../graphql/resolvers';

const {logInfo, logError, createSuccessResponse, createErrorResponse, initializeDatabase} = utils;

// Create executable schema using the new modular .graphql files
const schema = makeExecutableSchema({
    typeDefs: typeDefsString,
    resolvers,
});

// Initialize GraphQL Yoga
const yoga = createYoga({
    schema,
    context: ({request}) => ({
        request,
    }),
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    },
    graphqlEndpoint: '/graphql',
    landingPage: process.env.NODE_ENV !== 'production',
});

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        initializeDatabase();
        logInfo('Database initialized successfully');
    } catch (error) {
        logError('Failed to initialize database', error);
        return createErrorResponse('Database initialization failed', 500);
    }

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
        logInfo('Incoming GraphQL request', {
            httpMethod: event.httpMethod,
            path: event.path,
            headers: event.headers,
            body: event.body ? 'present' : 'empty',
        });

        // Create a Request object for GraphQL Yoga
        const url = new URL(event.path, `https://${event.headers.Host || 'localhost'}`);

        if (event.queryStringParameters) {
            Object.entries(event.queryStringParameters).forEach(([key, value]) => {
                if (value) {
                    url.searchParams.set(key, value);
                }
            });
        }

        const request = new Request(url, {
            method: event.httpMethod,
            headers: new Headers(event.headers as Record<string, string>),
            body: (event.httpMethod === 'GET' || event.httpMethod === 'HEAD') ? undefined : (event.body || undefined),
        });

        logInfo('Processing GraphQL request', {
            url: url.toString(),
            method: request.method,
        });

        // Process the request with GraphQL Yoga
        const response = await yoga.fetch(request, {
            event,
            context,
        });

        const responseText = await response.text();

        logInfo('GraphQL response generated', {
            status: response.status,
            contentType: response.headers.get('content-type'),
            bodySize: responseText.length,
        });

        return {
            statusCode: response.status,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'application/json',
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
            },
            body: responseText,
        };

    } catch (error) {
        logError('GraphQL Lambda error', error);
        return createErrorResponse(
            'Internal server error',
            500,
            process.env.NODE_ENV === 'development' ? {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            } : undefined
        );
    }
};

export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
    try {
        // Test database connection
        initializeDatabase();

        return createSuccessResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'graphql-lambda',
            version: process.env.LAMBDA_FUNCTION_VERSION || 'unknown',
        });
    } catch (error) {
        logError('Health check failed', error);

        return createErrorResponse(
            'Service unhealthy',
            503,
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }
        );
    }
};