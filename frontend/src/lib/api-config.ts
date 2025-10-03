import {fetchAuthSession, getCurrentUser} from 'aws-amplify/auth';

// API Configuration
export const API_CONFIG = {
    // Use local Lambda dev server in development, production API Gateway in production
    baseUrl: import.meta.env.VITE_API_URL,
    endpoints: {
        campaigns: {
            upload: '/campaigns/upload',
            send: '/campaigns/send',
        },
        graphql: '/graphql',
    },
};

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
    return `${API_CONFIG.baseUrl}${endpoint}`;
}

// Helper function to get auth token
export const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
    try {
        // First check if user is authenticated
        await getCurrentUser();

        // Get the session with optional force refresh
        const session = await fetchAuthSession({forceRefresh});

        // For Cognito User Pool authorizers, we need the ID token, not the access token
        const idToken = session.tokens?.idToken?.toString();

        if (idToken) {
            console.log('Successfully retrieved ID token for Cognito User Pool authorization');
            return idToken;
        } else {
            console.log('No ID token in session');
            return null;
        }
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
};

// Helper function to get auth headers from session
export async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
        const token = await getAuthToken();
        if (token) {
            return {
                Authorization: `Bearer ${token}`
            };
        }
        return {};
    } catch (error) {
        console.error('Failed to get auth headers:', error);
        return {};
    }
}