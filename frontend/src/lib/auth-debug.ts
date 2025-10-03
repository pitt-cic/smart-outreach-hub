import {fetchAuthSession, getCurrentUser} from 'aws-amplify/auth';

export const debugAuth = async () => {
    console.log('=== Auth Debug Info ===');

    try {
        // Check if user is authenticated
        const user = await getCurrentUser();
        console.log('Current user:', {
            username: user.username,
            userId: user.userId,
            signInDetails: user.signInDetails
        });

        // Get session details
        const session = await fetchAuthSession();
        console.log('Session details:', {
            hasTokens: !!session.tokens,
            hasAccessToken: !!session.tokens?.accessToken,
            hasIdToken: !!session.tokens?.idToken,
            credentials: !!session.credentials,
            identityId: session.identityId
        });

        if (session.tokens?.accessToken) {
            const token = session.tokens.accessToken.toString();
            console.log('Access token (first 50 chars):', token.substring(0, 50) + '...');

            // Decode JWT payload (just for debugging - don't do this in production)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('Token payload:', {
                    sub: payload.sub,
                    aud: payload.aud,
                    iss: payload.iss,
                    exp: new Date(payload.exp * 1000),
                    iat: new Date(payload.iat * 1000),
                    token_use: payload.token_use,
                    scope: payload.scope,
                    username: payload.username
                });
            } catch (e) {
                console.log('Could not decode token payload:', e);
            }
        }

        return true;
    } catch (error) {
        console.error('Auth debug error:', error);
        return false;
    }
};

export const testGraphQLAuth = async () => {
    console.log('=== Testing GraphQL Auth ===');

    try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        const idToken = session.tokens?.idToken?.toString();

        console.log('Available tokens:', {
            hasAccessToken: !!accessToken,
            hasIdToken: !!idToken
        });

        // For Cognito User Pool authorizers, we should use the ID token
        const token = idToken;

        if (!token) {
            console.error('No ID token available for Cognito User Pool authorization');
            return false;
        }

        console.log('Using ID token for GraphQL request');

        // Test the GraphQL endpoint directly
        const response = await fetch('https://4e92s5iyil.execute-api.us-east-1.amazonaws.com/prod/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    query TestAuth {
                        listAllCustomers {
                            phoneNumber
                        }
                    }
                `
            })
        });

        const result = await response.json();
        console.log('GraphQL test response:', {
            status: response.status,
            statusText: response.statusText,
            data: result
        });

        return response.ok;
    } catch (error) {
        console.error('GraphQL test error:', error);
        return false;
    }
};
