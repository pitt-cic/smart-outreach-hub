import {Amplify, type ResourcesConfig} from 'aws-amplify';

// Note: These values will need to be updated after CDK deployment
// You can get these from the CloudFormation stack outputs
const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
            userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
            loginWith: {
                email: true,
            },
            signUpVerificationMethod: 'code',
            userAttributes: {
                email: {
                    required: true,
                },
                given_name: {
                    required: true,
                },
                family_name: {
                    required: true,
                },
            },
            allowGuestAccess: false,
            passwordFormat: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialCharacters: false,
            },
        },
    },
} as ResourcesConfig;

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;