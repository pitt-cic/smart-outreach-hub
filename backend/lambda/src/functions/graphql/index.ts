import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {createYoga} from 'graphql-yoga';
import {makeExecutableSchema} from '@graphql-tools/schema';
// Import shared modules using relative paths
import {resolvers} from '../../shared/resolvers';
import * as utils from '../../shared/utils';

const {logInfo, logError, createSuccessResponse, createErrorResponse, initializeDatabase} = utils;

// GraphQL Schema Definition
const typeDefs = `
  enum CustomerStatus {
    automated
    needs_response
    agent_responding
  }

  enum MessageDirection {
    outbound
    inbound
  }

  enum ResponseType {
    automated
    manual
    ai_agent
  }

  type Customer {
    phoneNumber: String!
    firstName: String!
    lastName: String!
    mostRecentCampaignId: String
    status: CustomerStatus!
    createdAt: String!
    updatedAt: String!
    chatHistory: [ChatMessage!]!
  }

  type ChatMessage {
    id: ID!
    phoneNumber: String!
    campaignId: String
    message: String!
    direction: MessageDirection!
    timestamp: String!
    responseType: ResponseType
  }

  type Campaign {
    campaignId: ID!
    name: String!
    messageTemplate: String!
    campaignDetails: String
    totalContacts: Int!
    sentCount: Int!
    responseCount: Int!
    positiveResponseCount: Int!
    neutralResponseCount: Int!
    negativeResponseCount: Int!
    positiveResponseRate: Float!
    neutralResponseRate: Float!
    negativeResponseRate: Float!
    positiveHandoffCount: Int!
    neutralHandoffCount: Int!
    negativeHandoffCount: Int!
    firstResponsePositiveCount: Int!
    firstResponseNeutralCount: Int!
    firstResponseNegativeCount: Int!
    createdAt: String!
  }

  input ContactInput {
    firstName: String!
    lastName: String!
    phoneNumber: String!
  }

  input CreateCampaignInput {
    name: String!
    messageTemplate: String!
    campaignDetails: String
  }

  input UpdateCampaignInput {
    campaignId: ID!
    campaignDetails: String
  }

  type Query {
    getCustomer(phoneNumber: String!): Customer
    listCustomersNeedingResponse: [Customer!]!
    listAllCustomers: [Customer!]!
    getCampaign(campaignId: ID!): Campaign
    listCampaigns: [Campaign!]!
    getChatHistory(phoneNumber: String!): [ChatMessage!]!
    getAllMessages(limit: Int): [ChatMessage!]!
    getPrefilledMeetingMessage(phoneNumber: String!): String
  }

  type Mutation {
    createCampaign(input: CreateCampaignInput!): Campaign!
    updateCampaign(input: UpdateCampaignInput!): Campaign!
    sendCampaign(campaignId: ID!): Campaign!
    sendManualMessage(phoneNumber: String!, message: String!): ChatMessage!
    updateCustomerStatus(phoneNumber: String!, status: CustomerStatus!): Customer!
    simulateInboundMessage(phoneNumber: String!, message: String!): ChatMessage!
    clearAllData: Boolean!
  }
`;

// Create executable schema
const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

// Initialize GraphQL Yoga
const yoga = createYoga({
    schema,
    context: ({request}) => ({
        request,
        // Add any additional context here
    }),
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    },
    graphqlEndpoint: '/graphql',
    landingPage: process.env.NODE_ENV !== 'production', // Enable GraphQL playground in development
});

export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    // Initialize database connection
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

// Health check handler for API Gateway health checks
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