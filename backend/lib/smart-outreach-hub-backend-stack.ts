import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import {Construct} from 'constructs';
import * as path from 'path';

interface StackConfig {
    // SMS Configuration
    originationNumber: string;
    phoneNumberId: string;

    // Bedrock Configuration
    modelName: string;

    // Pydantic Configuration
    logfireToken: string;

    // Meeting Configuration
    calendlyUrl: string;
}

interface SmartOutreachHubBackendStackProps extends cdk.StackProps {
    stackConfig?: StackConfig;
}

export class SmartOutreachHubBackendStack extends cdk.Stack {
    private readonly stackConfig: StackConfig;

    constructor(scope: Construct, id: string, props?: SmartOutreachHubBackendStackProps) {
        super(scope, id, props);

        // Initialize stack configuration from context or defaults
        this.stackConfig = {
            originationNumber: this.node.getContext('smsConfig:originationNumber'),
            phoneNumberId: this.node.getContext('smsConfig:phoneNumberId'),
            modelName: this.node.getContext('bedrockConfig:modelName'),
            logfireToken: this.node.getContext('pydanticConfig:logfireToken'),
            calendlyUrl: this.node.getContext('meetingConfig:calendlyUrl'),
        };

        // AWS Amplify App for Frontend Hosting
        const amplifyAppConfig: any = {
            name: 'smart-outreach-hub',
            description: 'Smart Outreach Hub - AI-driven SMS Marketing Platform Frontend App',
            platform: 'WEB',
            customRules: [
                {
                    source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|html)$)([^.]+$)/>",
                    target: "/index.html",
                    status: "200",
                },
            ],
            environmentVariables: [
                {
                    name: 'VITE_API_URL',
                    value: '', // Will be set after API Gateway is created
                },
                {
                    name: 'VITE_COGNITO_USER_POOL_ID',
                    value: '', // Will be set after Cognito is created
                },
                {
                    name: 'VITE_COGNITO_USER_POOL_CLIENT_ID',
                    value: '', // Will be set after Cognito is created
                },
            ],
        };

        const amplifyApp = new amplify.CfnApp(this, 'SmartOutreachHubAmplifyApp', amplifyAppConfig);

        // Create Bedrock Guardrail for AI Safety
        const bedrockGuardrail = new bedrock.CfnGuardrail(this, 'SmartOutreachHubGuardrail', {
            name: 'smart-outreach-hub-ai-safety-guardrail',
            description: 'Guardrail for Smart Outreach Hub AI agent to ensure safe and appropriate responses',
            blockedInputMessaging: "I'm unable to assist you with that request. I'm here to help with tickets, donations, sponsorships, and general questions. Let's keep our conversation professional and focused on how I can assist you!",
            blockedOutputsMessaging: "I apologize, but I'm unable to provide a response right now. Please let me connect you with one of our team specialists who can better assist you with your needs. They'll be in touch shortly!",

            contentPolicyConfig: {
                filtersConfig: [
                    {
                        type: 'SEXUAL',
                        inputStrength: 'HIGH',
                        outputStrength: 'HIGH'
                    },
                    {
                        type: 'VIOLENCE',
                        inputStrength: 'HIGH',
                        outputStrength: 'HIGH'
                    },
                    {
                        type: 'HATE',
                        inputStrength: 'HIGH',
                        outputStrength: 'HIGH'
                    },
                    {
                        type: 'INSULTS',
                        inputStrength: 'HIGH',
                        outputStrength: 'HIGH'
                    },
                    {
                        type: 'MISCONDUCT',
                        inputStrength: 'HIGH',
                        outputStrength: 'HIGH'
                    },
                    {
                        type: 'PROMPT_ATTACK',
                        inputStrength: 'HIGH',
                        outputStrength: 'NONE'
                    }
                ]
            },

            // Word Policy Configuration
            wordPolicyConfig: {
                managedWordListsConfig: [
                    {
                        type: 'PROFANITY'
                    }
                ]
            },

            tags: [
                {
                    key: 'Project',
                    value: 'SmartOutreachHub'
                }
            ]
        });

        // Create Bedrock Guardrail Version
        const bedrockGuardrailVersion = new bedrock.CfnGuardrailVersion(this, 'SmartOutreachHubGuardrailVersion', {
            guardrailIdentifier: bedrockGuardrail.attrGuardrailId,
        });

        // DynamoDB Tables
        const customerTable = new dynamodb.Table(this, 'CustomerTable', {
            tableName: 'outreach-customers',
            partitionKey: {
                name: 'phone_number',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
            },
        });

        const chatTable = new dynamodb.Table(this, 'ChatTable', {
            tableName: 'outreach-chat-history',
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
            },
        });

        // Add GSI for querying by phone number
        chatTable.addGlobalSecondaryIndex({
            indexName: 'phone_number-timestamp-index',
            partitionKey: {
                name: 'phone_number',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp',
                type: dynamodb.AttributeType.STRING,
            },
        });

        const campaignTable = new dynamodb.Table(this, 'CampaignTable', {
            tableName: 'outreach-campaigns',
            partitionKey: {
                name: 'campaign_id',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
            },
        });

        const campaignCustomerTable = new dynamodb.Table(this, 'CampaignCustomerTable', {
            tableName: 'outreach-campaign-customers',
            partitionKey: {
                name: 'campaign_id',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'phone_number',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
            },
        });

        // Add GSI for querying by phone number
        campaignCustomerTable.addGlobalSecondaryIndex({
            indexName: 'phone_number-campaign_id-index',
            partitionKey: {
                name: 'phone_number',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'campaign_id',
                type: dynamodb.AttributeType.STRING,
            },
        });

        // SNS Topic for message processing
        const messageTopic = new sns.Topic(this, 'MessageTopic', {
            topicName: 'outreach-messages',
            displayName: 'Smart Outreach Hub Messages Topic',
        });

        // Cognito User Pool for authentication
        const userPool = new cognito.UserPool(this, 'SmartOutreachHubUserPool', {
            userPoolName: 'outreach-user-pool',
            signInAliases: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: 'Welcome to Smart Outreach Hub - Verify your email',
                emailBody: 'Hello, thanks for signing up to Smart Outreach Hub! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
        });

        // Cognito User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'SmartOutreachHubUserPoolClient', {
            userPool,
            userPoolClientName: 'outreach-web-client',
            generateSecret: false, // No secret for web clients
            authFlows: {
                userSrp: true,
                userPassword: true,
                adminUserPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:3000/auth/callback',
                    'https://localhost:3000/auth/callback',
                    `https://main.${amplifyApp.attrAppId}.amplifyapp.com/auth/callback`,
                ],
                logoutUrls: [
                    'http://localhost:3000/auth/logout',
                    'https://localhost:3000/auth/logout',
                    `https://main.${amplifyApp.attrAppId}.amplifyapp.com/auth/logout`,
                ],
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
        });

        // Cognito User Pool Domain for hosted UI
        const userPoolDomain = new cognito.UserPoolDomain(this, 'SmartOutreachHubUserPoolDomain', {
            userPool,
            cognitoDomain: {
                domainPrefix: `outreach-auth-${this.account}`, // Must be globally unique
            },
        });

        // Amplify Branch for the main deployment
        const amplifyBranch = new amplify.CfnBranch(this, 'SmartOutreachHubAmplifyBranch', {
            appId: amplifyApp.attrAppId,
            branchName: 'main',
            stage: 'PRODUCTION',
            enableAutoBuild: true,
            enablePullRequestPreview: false,
        });


        // API Gateway for SMS webhook (optional - can point to the Next.js server instead)
        const api = new apigateway.RestApi(this, 'SmartOutreachHubApi', {
            restApiName: 'Smart Outreach Hub SMS API',
            description: 'API for SMS webhook handling',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
        });

        // Cognito Authorizer for API Gateway
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'outreach-cognito-authorizer',
            identitySource: 'method.request.header.Authorization',
        });

        // SQS Queue for outbound SMS messages (direct SMS)
        const outboundSmsQueue = new sqs.Queue(this, 'SmartOutreachHubOutboundSmsQueue', {
            queueName: 'outreach-outbound-sms-queue',
            visibilityTimeout: cdk.Duration.minutes(3),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'SmartOutreachHubOutboundSmsDeadLetterQueue', {
                    queueName: 'outreach-outbound-sms-dlq',
                }),
                maxReceiveCount: 3,
            },
        });

        // SQS Queue for all campaign messages (unified)
        const campaignMessageQueue = new sqs.Queue(this, 'SmartOutreachHubCampaignMessageQueue', {
            queueName: 'outreach-campaign-message-queue',
            visibilityTimeout: cdk.Duration.minutes(3),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'SmartOutreachHubMessageDeadLetterQueue', {
                    queueName: 'outreach-campaign-message-dlq',
                }),
                maxReceiveCount: 3,
            },
        });

        const aiAgentLogGroup = new logs.LogGroup(this, 'AiAgentLogGroup', {
            logGroupName: '/aws/lambda/outreach-ai-agent',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Python Lambda function for AI Agent processing
        const aiAgentFunction = new lambda.Function(this, 'AiAgentFunction', {
            functionName: 'outreach-ai-agent',
            runtime: lambda.Runtime.PYTHON_3_12,
            architecture: lambda.Architecture.ARM_64,
            handler: 'lambda_handler.lambda_handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../agent'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    platform: 'linux/arm64',
                    command: [
                        'bash', '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
                    ],
                },
            }),
            timeout: cdk.Duration.minutes(15),
            memorySize: 2048,
            environment: {
                ENVIRONMENT: 'dev',
                // Amazon Bedrock Configuration
                BEDROCK_MODEL_NAME: this.stackConfig.modelName,
                BEDROCK_GUARDRAIL_ID: bedrockGuardrail.attrGuardrailId,
                BEDROCK_GUARDRAIL_VERSION: bedrockGuardrailVersion.attrVersion,
                BEDROCK_GUARDRAIL_TRACE: 'enabled',
                // DynamoDB Tables
                DYNAMODB_CUSTOMER_TABLE: customerTable.tableName,
                DYNAMODB_CHAT_TABLE: chatTable.tableName,
                DYNAMODB_CAMPAIGN_TABLE: campaignTable.tableName,
                DYNAMODB_CAMPAIGN_CUSTOMER_TABLE: campaignCustomerTable.tableName,
                // SQS Queues
                OUTBOUND_SMS_QUEUE_URL: outboundSmsQueue.queueUrl,
                // Pydantic AI Configuration
                PYDANTIC_LOGFIRE_TOKEN: this.stackConfig.logfireToken,
                // Python Path
                PYTHONPATH: '/var/runtime:/var/task',
            },
            logGroup: aiAgentLogGroup,
        });

        // Grant permissions to AI Agent function
        customerTable.grantReadWriteData(aiAgentFunction);
        chatTable.grantReadWriteData(aiAgentFunction);
        campaignTable.grantReadWriteData(aiAgentFunction);
        campaignCustomerTable.grantReadWriteData(aiAgentFunction);

        // Grant Bedrock permissions to AI Agent function
        aiAgentFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:GetFoundationModel',
                'bedrock:ListFoundationModels',
                'bedrock:ApplyGuardrail',
                'bedrock:RetrieveAndGenerate',
                'bedrock:Retrieve'
            ],
            resources: [
                `arn:aws:bedrock:*::foundation-model/*`,
                `arn:aws:bedrock:*:${this.account}:*`,
                `arn:aws:bedrock:*:${this.account}:guardrail/*`,
                `arn:aws:bedrock:*:${this.account}:knowledge-base/*`,
            ],
        }));

        // Grant SMS and SNS permissions to AI Agent function
        aiAgentFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'sms-voice:SendTextMessage',
                'pinpoint:SendMessages',
                'sns:Publish',
            ],
            resources: [
                `arn:aws:sns:${this.region}:${this.account}:outreach-*`,
                `arn:aws:sms-voice:${this.region}:${this.account}:*`,
            ],
        }));

        // Grant SQS permissions to AI Agent function
        outboundSmsQueue.grantSendMessages(aiAgentFunction);

        // API Gateway integrations
        const aiAgentIntegration = new apigateway.LambdaIntegration(aiAgentFunction, {
            timeout: cdk.Duration.seconds(29), // Max API Gateway timeout
        });

        // AI Agent endpoints
        const agentResource = api.root.addResource('agent');
        const processMessageResource = agentResource.addResource('process-message');
        processMessageResource.addMethod('POST', aiAgentIntegration, {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // Health check endpoint for AI agent (public - no auth required)
        const healthResource = agentResource.addResource('health');
        healthResource.addMethod('GET', aiAgentIntegration);

        const graphqlLogGroup = new logs.LogGroup(this, 'GraphQLLogGroup', {
            logGroupName: '/aws/lambda/outreach-graphql-api',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // GraphQL Lambda function
        const graphqlFunction = new lambda.Function(this, 'SmartOutreachHubGraphQLFunction', {
            functionName: 'outreach-graphql-api',
            runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS, {supportsInlineCode: true}),
            handler: 'functions/graphql/index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
                bundling: {
                    image: cdk.DockerImage.fromRegistry('node:22-alpine'),
                    user: 'root',
                    command: [
                        'sh', '-c',
                        'apk add --no-cache python3 make g++ && ' +
                        'npm install --cache /tmp/.npm --no-audit --no-fund && ' +
                        'npm run build && ' +
                        'cp -r dist/* /asset-output/ && ' +
                        'mkdir -p /asset-output/graphql && ' +
                        'cp -r src/graphql/schema /asset-output/graphql/ && ' +
                        'cp -r node_modules /asset-output/ && ' +
                        'cp package.json /asset-output/'
                    ],
                },
            }),
            timeout: cdk.Duration.seconds(29), // Max API Gateway timeout
            memorySize: 1024, // Sufficient for GraphQL operations
            environment: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'INFO',
                CORS_ORIGIN: '*', // Configure as needed
                DYNAMODB_CUSTOMER_TABLE: customerTable.tableName,
                DYNAMODB_CHAT_TABLE: chatTable.tableName,
                DYNAMODB_CAMPAIGN_TABLE: campaignTable.tableName,
                DYNAMODB_CAMPAIGN_CUSTOMER_TABLE: campaignCustomerTable.tableName,
                CAMPAIGN_MESSAGE_QUEUE_URL: campaignMessageQueue.queueUrl,
                CALENDLY_URL: this.stackConfig.calendlyUrl,
            },
            logGroup: graphqlLogGroup,
        });

        // Grant permissions to GraphQL function
        customerTable.grantReadWriteData(graphqlFunction);
        chatTable.grantReadWriteData(graphqlFunction);
        campaignTable.grantReadWriteData(graphqlFunction);
        campaignCustomerTable.grantReadWriteData(graphqlFunction);


        // Grant SQS permissions to GraphQL function for campaigns
        campaignMessageQueue.grantSendMessages(graphqlFunction);

        // GraphQL API Gateway integration
        const graphqlIntegration = new apigateway.LambdaIntegration(graphqlFunction, {
            timeout: cdk.Duration.seconds(29),
            proxy: true,
        });

        // GraphQL endpoints
        const graphqlResource = api.root.addResource('graphql');
        graphqlResource.addMethod('POST', graphqlIntegration, {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // GraphQL GET endpoint for introspection (with auth)
        graphqlResource.addMethod('GET', graphqlIntegration, {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // GraphQL health check endpoint (public - no auth required)
        const graphqlHealthResource = graphqlResource.addResource('health');
        graphqlHealthResource.addMethod('GET', new apigateway.LambdaIntegration(graphqlFunction, {
            timeout: cdk.Duration.seconds(29),
            proxy: true,
        }));

        const campaignsLogGroup = new logs.LogGroup(this, 'SmartOutreachHubCampaignsLogGroup', {
            logGroupName: '/aws/lambda/outreach-campaigns-api',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Campaigns Lambda function
        const campaignsFunction = new lambda.Function(this, 'SmartOutreachHubCampaignsFunction', {
            functionName: 'outreach-campaigns-api',
            runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS, {supportsInlineCode: true}),
            handler: 'functions/campaigns/index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
                bundling: {
                    image: cdk.DockerImage.fromRegistry('node:22-alpine'),
                    user: 'root',
                    command: [
                        'sh', '-c',
                        'apk add --no-cache python3 make g++ && ' +
                        'npm install --cache /tmp/.npm --no-audit --no-fund && ' +
                        'npm run build && ' +
                        'cp -r dist/* /asset-output/ && ' +
                        'cp -r node_modules /asset-output/ && ' +
                        'cp package.json /asset-output/'
                    ],
                },
            }),
            timeout: cdk.Duration.seconds(29), // Max API Gateway timeout
            memorySize: 1024, // Sufficient for file operations
            environment: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'INFO',
                CORS_ORIGIN: '*', // Configure as needed,
                DYNAMODB_CUSTOMER_TABLE: customerTable.tableName,
                DYNAMODB_CHAT_TABLE: chatTable.tableName,
                DYNAMODB_CAMPAIGN_TABLE: campaignTable.tableName,
                DYNAMODB_CAMPAIGN_CUSTOMER_TABLE: campaignCustomerTable.tableName,
            },
            logGroup: campaignsLogGroup,
        });
        // Grant DynamoDB permissions to campaign function
        customerTable.grantReadWriteData(campaignsFunction);
        chatTable.grantReadWriteData(campaignsFunction);
        campaignTable.grantReadWriteData(campaignsFunction);
        campaignCustomerTable.grantReadWriteData(campaignsFunction);

        // Campaigns API Gateway integration
        const campaignsIntegration = new apigateway.LambdaIntegration(campaignsFunction, {
            timeout: cdk.Duration.seconds(29),
            proxy: true,
        });

        // Campaigns endpoints
        const campaignsResource = api.root.addResource('campaigns');

        // Campaign upload endpoint
        const uploadResource = campaignsResource.addResource('upload');
        uploadResource.addMethod('POST', campaignsIntegration, {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // Use existing SNS Topic for incoming SMS messages
        const inboundSmsTopic = new sns.Topic(this, 'InboundSmsTopic', {
            topicName: 'outreach-inbound-sms',
            displayName: 'Smart Outreach Hub Inbound SMS Topic',
        });

        // SQS Queue for processing inbound messages
        const inboundSmsQueue = new sqs.Queue(this, 'InboundSmsQueue', {
            queueName: 'outreach-inbound-sms-queue',
            visibilityTimeout: cdk.Duration.minutes(5),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'InboundSmsDeadLetterQueue', {
                    queueName: 'outreach-inbound-sms-dlq',
                    retentionPeriod: cdk.Duration.days(14),
                }),
                maxReceiveCount: 3,
            },
        });

        // Subscribe our SQS queue to the existing SNS topic
        inboundSmsTopic.addSubscription(new snsSubscriptions.SqsSubscription(inboundSmsQueue));

        const inboundSmsLogGroup = new logs.LogGroup(this, 'SmartOutreachHubInboundSmsLogGroup', {
            logGroupName: '/aws/lambda/outreach-inbound-sms-processor',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda function for processing inbound SMS messages
        const inboundSmsProcessor = new lambda.Function(this, 'SmartOutreachHubInboundSmsProcessor', {
            functionName: 'outreach-inbound-sms-processor',
            runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS, {supportsInlineCode: true}),
            handler: 'functions/inbound-sms-processor/index.handler',
            architecture: lambda.Architecture.ARM_64,
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
                bundling: {
                    image: cdk.DockerImage.fromRegistry('node:22-alpine'),
                    user: 'root',
                    command: [
                        'sh', '-c',
                        'apk add --no-cache python3 make g++ && ' +
                        'npm install --cache /tmp/.npm --no-audit --no-fund && ' +
                        'npm run build && ' +
                        'cp -r dist/* /asset-output/ && ' +
                        'cp -r node_modules /asset-output/ && ' +
                        'cp package.json /asset-output/'
                    ],
                },
            }),
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            environment: {
                DYNAMODB_CUSTOMER_TABLE: customerTable.tableName,
                DYNAMODB_CHAT_TABLE: chatTable.tableName,
                AI_AGENT_FUNCTION_NAME: aiAgentFunction.functionName,
            },
            logGroup: inboundSmsLogGroup,
        });

        // SQS trigger for inbound SMS processor
        inboundSmsProcessor.addEventSource(
            new lambdaEventSources.SqsEventSource(inboundSmsQueue, {
                batchSize: 10,
                maxBatchingWindow: cdk.Duration.seconds(5),
                reportBatchItemFailures: true,
            })
        );

        // Grant permissions to inbound SMS processor
        customerTable.grantReadWriteData(inboundSmsProcessor);
        chatTable.grantReadWriteData(inboundSmsProcessor);
        aiAgentFunction.grantInvoke(inboundSmsProcessor);

        const directSmsLogGroup = new logs.LogGroup(this, 'SmartOutreachHubDirectSmsLogGroup', {
            logGroupName: '/aws/lambda/outreach-direct-sms',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Lambda function for direct SMS sending (manual messages)
        const directSmsFunction = new lambda.Function(this, 'SmartOutreachHubDirectSmsFunction', {
            functionName: 'outreach-direct-sms',
            runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS, {supportsInlineCode: true}),
            handler: 'functions/direct-sms/index.handler',
            architecture: lambda.Architecture.ARM_64,
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
                bundling: {
                    image: cdk.DockerImage.fromRegistry('node:22-alpine'),
                    user: 'root',
                    command: [
                        'sh', '-c',
                        'apk add --no-cache python3 make g++ && ' +
                        'npm install --cache /tmp/.npm --no-audit --no-fund && ' +
                        'npm run build && ' +
                        'cp -r dist/* /asset-output/ && ' +
                        'cp -r node_modules /asset-output/ && ' +
                        'cp package.json /asset-output/'
                    ],
                },
            }),
            timeout: cdk.Duration.minutes(2),
            memorySize: 256,
            environment: {
                DYNAMODB_CUSTOMER_TABLE: customerTable.tableName,
                DYNAMODB_CHAT_TABLE: chatTable.tableName,
                DYNAMODB_CAMPAIGN_TABLE: campaignTable.tableName,
                DYNAMODB_CAMPAIGN_CUSTOMER_TABLE: campaignCustomerTable.tableName,
                ORIGINATION_IDENTITY: this.stackConfig.phoneNumberId,
            },
            logGroup: directSmsLogGroup,
        });

        // Grant End User Messaging permissions to direct SMS function
        directSmsFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'sms-voice:SendTextMessage',
            ],
            resources: [
                '*', // End User Messaging resources don't follow the standard ARN pattern
            ],
        }));

        // Grant DynamoDB permissions to direct SMS function
        customerTable.grantReadWriteData(directSmsFunction);
        campaignTable.grantReadWriteData(directSmsFunction);
        chatTable.grantReadWriteData(directSmsFunction);
        campaignCustomerTable.grantReadWriteData(directSmsFunction);

        // SQS trigger for direct SMS function (outbound messages)
        directSmsFunction.addEventSource(
            new lambdaEventSources.SqsEventSource(outboundSmsQueue, {
                batchSize: 10,
                maxBatchingWindow: cdk.Duration.seconds(5),
                reportBatchItemFailures: true,
            })
        );

        // SQS trigger for direct SMS function (personalized campaigns)
        directSmsFunction.addEventSource(
            new lambdaEventSources.SqsEventSource(campaignMessageQueue, {
                batchSize: 10,
                maxBatchingWindow: cdk.Duration.seconds(5),
                reportBatchItemFailures: true,
            })
        );

        // Webhook endpoint for inbound SMS (public - no auth)
        const webhookResource = api.root.addResource('webhook');
        const smsWebhookResource = webhookResource.addResource('sms');
        smsWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(inboundSmsProcessor, {
            timeout: cdk.Duration.seconds(29),
            proxy: true,
        }));

        // CloudFormation Outputs
        new cdk.CfnOutput(this, 'CustomerTableName', {
            value: customerTable.tableName,
            description: 'DynamoDB Customer Table Name',
            exportName: 'SmartOutreachHubCustomerTableName',
        });

        new cdk.CfnOutput(this, 'ChatTableName', {
            value: chatTable.tableName,
            description: 'DynamoDB Chat History Table Name',
            exportName: 'SmartOutreachHubChatTableName',
        });

        new cdk.CfnOutput(this, 'CampaignTableName', {
            value: campaignTable.tableName,
            description: 'DynamoDB Campaign Table Name',
            exportName: 'SmartOutreachHubCampaignTableName',
        });

        new cdk.CfnOutput(this, 'CampaignCustomerTableName', {
            value: campaignCustomerTable.tableName,
            description: 'DynamoDB Campaign Customer Table Name',
            exportName: 'SmartOutreachHubCampaignCustomerTableName',
        });

        new cdk.CfnOutput(this, 'MessageTopicArn', {
            value: messageTopic.topicArn,
            description: 'SNS Topic ARN for message processing',
            exportName: 'SmartOutreachHubMessageTopicArn',
        });

        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: api.url,
            description: 'API Gateway URL for SMS webhook',
            exportName: 'SmartOutreachHubApiGatewayUrl',
        });

        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: amplifyApp.attrAppId,
            description: 'AWS Amplify App ID for frontend hosting',
            exportName: 'SmartOutreachHubAmplifyAppId',
        });

        new cdk.CfnOutput(this, 'AmplifyAppName', {
            value: amplifyApp.name,
            description: 'AWS Amplify App Name',
            exportName: 'SmartOutreachHubAmplifyAppName',
        });

        // New outputs for AI Agent and Amplify
        new cdk.CfnOutput(this, 'AiAgentFunctionName', {
            value: aiAgentFunction.functionName,
            description: 'Lambda function name for AI Agent',
            exportName: 'SmartOutreachHubAiAgentFunctionName',
        });

        new cdk.CfnOutput(this, 'AiAgentFunctionArn', {
            value: aiAgentFunction.functionArn,
            description: 'Lambda function ARN for AI Agent',
            exportName: 'SmartOutreachHubAiAgentFunctionArn',
        });

        new cdk.CfnOutput(this, 'AgentApiUrl', {
            value: `${api.url}agent/process-message`,
            description: 'API Gateway URL for AI Agent processing',
            exportName: 'SmartOutreachHubAgentApiUrl',
        });

        // GraphQL Lambda Outputs
        new cdk.CfnOutput(this, 'GraphQLFunctionName', {
            value: graphqlFunction.functionName,
            description: 'Lambda function name for GraphQL API',
            exportName: 'SmartOutreachHubGraphQLFunctionName',
        });

        new cdk.CfnOutput(this, 'GraphQLFunctionArn', {
            value: graphqlFunction.functionArn,
            description: 'Lambda function ARN for GraphQL API',
            exportName: 'SmartOutreachHubGraphQLFunctionArn',
        });

        new cdk.CfnOutput(this, 'GraphQLApiUrl', {
            value: `${api.url}graphql`,
            description: 'API Gateway URL for GraphQL API',
            exportName: 'SmartOutreachHubGraphQLApiUrl',
        });

        new cdk.CfnOutput(this, 'GraphQLHealthUrl', {
            value: `${api.url}graphql/health`,
            description: 'GraphQL Lambda health check URL',
            exportName: 'SmartOutreachHubGraphQLHealthUrl',
        });

        // Campaigns Lambda Outputs
        new cdk.CfnOutput(this, 'CampaignsFunctionName', {
            value: campaignsFunction.functionName,
            description: 'Lambda function name for Campaigns API',
            exportName: 'SmartOutreachHubCampaignsFunctionName',
        });

        new cdk.CfnOutput(this, 'CampaignsFunctionArn', {
            value: campaignsFunction.functionArn,
            description: 'Lambda function ARN for Campaigns API',
            exportName: 'SmartOutreachHubCampaignsFunctionArn',
        });

        new cdk.CfnOutput(this, 'CampaignsUploadUrl', {
            value: `${api.url}campaigns/upload`,
            description: 'API Gateway URL for Campaign Contact Upload',
            exportName: 'SmartOutreachHubCampaignsUploadUrl',
        });

        // Amplify Domain Output (will be available after deployment)
        new cdk.CfnOutput(this, 'AmplifyDomainUrl', {
            value: `https://${amplifyBranch.branchName}.${amplifyApp.attrAppId}.amplifyapp.com`,
            description: 'AWS Amplify frontend URL',
            exportName: 'SmartOutreachHubAmplifyDomainUrl',
        });

        // Cognito Outputs
        new cdk.CfnOutput(this, 'CognitoUserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: 'SmartOutreachHubCognitoUserPoolId',
        });

        new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: 'SmartOutreachHubCognitoUserPoolClientId',
        });

        new cdk.CfnOutput(this, 'CognitoUserPoolArn', {
            value: userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
            exportName: 'SmartOutreachHubCognitoUserPoolArn',
        });

        new cdk.CfnOutput(this, 'CognitoDomain', {
            value: userPoolDomain.domainName,
            description: 'Cognito hosted UI domain',
            exportName: 'SmartOutreachHubCognitoDomain',
        });

        new cdk.CfnOutput(this, 'CognitoHostedUIUrl', {
            value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
            description: 'Cognito hosted UI URL',
            exportName: 'SmartOutreachHubCognitoHostedUIUrl',
        });
        // SMS Infrastructure Outputs
        new cdk.CfnOutput(this, 'InboundSmsTopicArn', {
            value: inboundSmsTopic.topicArn,
            description: 'SNS Topic ARN for inbound SMS messages',
            exportName: 'SmartOutreachHubInboundSmsTopicArn',
        });

        new cdk.CfnOutput(this, 'InboundSmsQueueUrl', {
            value: inboundSmsQueue.queueUrl,
            description: 'SQS Queue URL for inbound SMS processing',
            exportName: 'SmartOutreachHubInboundSmsQueueUrl',
        });

        new cdk.CfnOutput(this, 'OutboundSmsQueueUrl', {
            value: outboundSmsQueue.queueUrl,
            description: 'SQS Queue URL for outbound SMS processing',
            exportName: 'SmartOutreachHubOutboundSmsQueueUrl',
        });

        new cdk.CfnOutput(this, 'InboundSmsProcessorFunctionName', {
            value: inboundSmsProcessor.functionName,
            description: 'Lambda function name for inbound SMS processing',
            exportName: 'SmartOutreachHubInboundSmsProcessorFunctionName',
        });

        new cdk.CfnOutput(this, 'DirectSmsFunctionName', {
            value: directSmsFunction.functionName,
            description: 'Lambda function name for direct SMS sending',
            exportName: 'SmartOutreachHubDirectSmsFunctionName',
        });

        new cdk.CfnOutput(this, 'SmsWebhookUrl', {
            value: `${api.url}webhook/sms`,
            description: 'API Gateway URL for SMS webhook',
            exportName: 'SmartOutreachHubSmsWebhookUrl',
        });

        new cdk.CfnOutput(this, 'SendCampaignsApiUrl', {
            value: `${api.url}sms/campaigns`,
            description: 'API Gateway URL for sending campaigns',
            exportName: 'SmartOutreachHubSendCampaignsApiUrl',
        });

        new cdk.CfnOutput(this, 'DirectSmsApiUrl', {
            value: `${api.url}sms/send`,
            description: 'API Gateway URL for direct SMS sending',
            exportName: 'SmartOutreachHubDirectSmsApiUrl',
        });

        // Bedrock Guardrail Outputs
        new cdk.CfnOutput(this, 'BedrockGuardrailId', {
            value: bedrockGuardrail.attrGuardrailId,
            description: 'Bedrock Guardrail ID for AI safety',
            exportName: 'SmartOutreachHubBedrockGuardrailId',
        });

        new cdk.CfnOutput(this, 'BedrockGuardrailArn', {
            value: bedrockGuardrail.attrGuardrailArn,
            description: 'Bedrock Guardrail ARN for AI safety',
            exportName: 'SmartOutreachHubBedrockGuardrailArn',
        });

        new cdk.CfnOutput(this, 'BedrockGuardrailVersion', {
            value: bedrockGuardrailVersion.attrVersion,
            description: 'Bedrock Guardrail Version',
            exportName: 'SmartOutreachHubBedrockGuardrailVersion',
        });
    }
}
