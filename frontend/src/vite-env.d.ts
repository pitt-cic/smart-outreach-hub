/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AWS_REGION: string
    readonly VITE_COGNITO_USER_POOL_ID: string
    readonly VITE_COGNITO_USER_POOL_CLIENT_ID: string
    readonly VITE_COGNITO_REGION: string
    readonly VITE_DYNAMODB_CUSTOMER_TABLE: string
    readonly VITE_DYNAMODB_CHAT_TABLE: string
    readonly VITE_DYNAMODB_CAMPAIGN_TABLE: string
    readonly VITE_SNS_TOPIC_ARN: string
    readonly VITE_AWS_END_USER_MESSAGING_CONFIG_SET: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_API_URL: string
    readonly VITE_SMS_WEBHOOK_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
