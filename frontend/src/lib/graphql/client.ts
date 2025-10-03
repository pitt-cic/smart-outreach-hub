import {createClient, cacheExchange, fetchExchange, Exchange} from 'urql';
import {authExchange} from '@urql/exchange-auth';
import {getAuthToken} from '../api-config';


// Auth exchange for adding JWT tokens to requests
const authExchangeConfig = authExchange(async (utils) => {
    let token: string | null = null;

    return {
        addAuthToOperation(operation) {
            // Always try to add token if available
            if (!token) {
                console.log('No token available for GraphQL request');
                return operation;
            }

            return utils.appendHeaders(operation, {
                Authorization: `Bearer ${token}`,
            });
        },
        didAuthError(error) {
            // Check for various authentication error patterns
            const hasGraphQLAuthError = error.graphQLErrors?.some(
                (e) => {
                    const code = e.extensions?.code;
                    return code === 'UNAUTHENTICATED' ||
                        code === 'UNAUTHORIZED' ||
                        code === 'FORBIDDEN' ||
                        e.message?.toLowerCase().includes('unauthorized') ||
                        e.message?.toLowerCase().includes('unauthenticated');
                }
            ) || false;

            const hasNetworkAuthError = error.networkError && (
                (error.networkError as any).statusCode === 401 ||
                (error.networkError as any).statusCode === 403
            );

            const isAuthError = hasGraphQLAuthError || Boolean(hasNetworkAuthError);

            if (isAuthError) {
                console.log('Authentication error detected:', error);
                token = null; // Clear the token
            }

            return isAuthError;
        },
        async refreshAuth() {
            console.log('Refreshing authentication...');

            try {
                // First try to get a fresh token
                token = await getAuthToken(true);

                if (token) {
                    console.log('Auth token refreshed successfully');
                } else {
                    console.log('Failed to refresh auth token - user may need to login');
                }
            } catch (error) {
                console.error('Error during auth refresh:', error);
                token = null;
            }
        },
        willAuthError(operation) {
            // Return true if we don't have a token (will trigger refreshAuth)
            const needsAuth = !token;
            if (needsAuth) {
                console.log('No token available, will trigger auth refresh');
            }
            return needsAuth;
        },
    };
});

// Create urql client with auth
export const graphqlClient = createClient({
    url: import.meta.env.VITE_API_URL + "/graphql",
    exchanges: [
        cacheExchange,
        authExchangeConfig as Exchange,
        fetchExchange,
    ],
    // Add request policy to always fetch fresh data for auth-sensitive operations
    requestPolicy: 'cache-and-network',
});

// GraphQL queries and mutations
export const GET_CUSTOMERS_NEEDING_RESPONSE = `
  query GetCustomersNeedingResponse {
    listCustomersNeedingResponse {
      phoneNumber
      firstName
      lastName
      mostRecentCampaignId
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_CUSTOMERS_BY_STATUS = `
  query GetCustomersByStatus($status: CustomerStatus) {
    listCustomersByStatus(status: $status) {
      phoneNumber
      firstName
      lastName
      mostRecentCampaignId
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_CUSTOMERS = `
  query GetAllCustomers {
    listAllCustomers {
      phoneNumber
      firstName
      lastName
      mostRecentCampaignId
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_CUSTOMER = `
  query GetCustomer($phoneNumber: String!) {
    getCustomer(phoneNumber: $phoneNumber) {
      phoneNumber
      firstName
      lastName
      mostRecentCampaignId
      status
      createdAt
      updatedAt
      chatHistory {
        id
        phoneNumber
        campaignId
        message
        direction
        timestamp
        responseType
      }
    }
  }
`;

export const GET_CHAT_HISTORY = `
  query GetChatHistory($phoneNumber: String!) {
    getChatHistory(phoneNumber: $phoneNumber) {
      id
      phoneNumber
      campaignId
      message
      direction
      timestamp
      responseType
    }
  }
`;

export const GET_ALL_MESSAGES = `
  query GetAllMessages($limit: Int) {
    getAllMessages(limit: $limit) {
      id
      phoneNumber
      campaignId
      message
      direction
      timestamp
      responseType
    }
  }
`;

export const GET_CAMPAIGNS = `
  query GetCampaigns {
    listCampaigns {
      campaignId
      name
      messageTemplate
      campaignDetails
      totalContacts
      sentCount
      responseCount
      positiveResponseCount
      neutralResponseCount
      negativeResponseCount
      positiveResponseRate
      neutralResponseRate
      negativeResponseRate
      positiveHandoffCount
      neutralHandoffCount
      negativeHandoffCount
      firstResponsePositiveCount
      firstResponseNeutralCount
      firstResponseNegativeCount
      createdAt
    }
  }
`;

export const GET_CAMPAIGN = `
  query GetCampaign($campaignId: ID!) {
    getCampaign(campaignId: $campaignId) {
      campaignId
      name
      messageTemplate
      totalContacts
      sentCount
      responseCount
      createdAt
    }
  }
`;

export const CREATE_CAMPAIGN = `
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      campaignId
      name
      messageTemplate
      campaignDetails
      totalContacts
      sentCount
      responseCount
      createdAt
    }
  }
`;

export const UPDATE_CAMPAIGN = `
  mutation UpdateCampaign($input: UpdateCampaignInput!) {
    updateCampaign(input: $input) {
      campaignId
      name
      messageTemplate
      campaignDetails
      totalContacts
      sentCount
      responseCount
      createdAt
    }
  }
`;

export const SEND_CAMPAIGN = `
  mutation SendCampaign($campaignId: ID!) {
    sendCampaign(campaignId: $campaignId) {
      campaignId
      name
      messageTemplate
      totalContacts
      sentCount
      responseCount
      createdAt
    }
  }
`;

export const SEND_MANUAL_MESSAGE = `
  mutation SendManualMessage($phoneNumber: String!, $message: String!) {
    sendManualMessage(phoneNumber: $phoneNumber, message: $message) {
      id
      phoneNumber
      campaignId
      message
      direction
      timestamp
      responseType
    }
  }
`;

export const GET_PREFILLED_MEETING_MESSAGE = `
  query GetPrefilledMeetingMessage($phoneNumber: String!) {
    getPrefilledMeetingMessage(phoneNumber: $phoneNumber)
  }
`;

export const UPDATE_CUSTOMER_STATUS = `
  mutation UpdateCustomerStatus($phoneNumber: String!, $status: CustomerStatus!) {
    updateCustomerStatus(phoneNumber: $phoneNumber, status: $status) {
      phoneNumber
      firstName
      lastName
      mostRecentCampaignId
      status
      createdAt
      updatedAt
    }
  }
`;

export const SIMULATE_INBOUND_MESSAGE = `
  mutation SimulateInboundMessage($phoneNumber: String!, $message: String!) {
    simulateInboundMessage(phoneNumber: $phoneNumber, message: $message) {
      id
      phoneNumber
      campaignId
      message
      direction
      timestamp
      responseType
    }
  }
`;

export const CLEAR_ALL_DATA = `
  mutation ClearAllData {
    clearAllData
  }
`;

