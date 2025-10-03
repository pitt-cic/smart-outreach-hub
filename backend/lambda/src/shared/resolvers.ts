import {CampaignModel, ChatMessageModel, CustomerModel, DatabaseUtils} from './database';
import {Campaign, ChatMessage, CreateCampaignInput, Customer, DbCampaign, ValidationError} from './types';
import {logError, logInfo, normalizePhoneNumber, validatePhoneNumber} from './utils';
import {sendCampaignViaSQS, sendManualMessageToSQS} from './sqs-service';
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';


const lambdaClient = new LambdaClient({region: process.env.AWS_REGION || 'us-east-1'});


async function invokePythonAgent(phoneNumber: string, message: string): Promise<string> {
    const payload = {
        phone_number: phoneNumber,
        message: message
    };

    const command = new InvokeCommand({
        FunctionName: 'marketing-ai-agent',
        InvocationType: 'RequestResponse', // Synchronous call
        Payload: JSON.stringify(payload)
    });

    try {
        logInfo('Invoking Python AI agent', {phoneNumber, messageLength: message.length});

        const response = await lambdaClient.send(command);

        if (response.Payload) {
            const result = JSON.parse(new TextDecoder().decode(response.Payload));
            logInfo('Raw AI agent response', {result});

            // Check if Lambda execution was successful
            if (result.statusCode === 200) {
                // Handle case where body might be undefined or not a string
                if (!result.body) {
                    logError('AI agent returned undefined body', {result});
                    throw new Error('AI agent returned undefined response body');
                }

                let body;
                try {
                    body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
                } catch (parseError) {
                    logError('Failed to parse AI agent response body', {body: result.body, parseError});
                    throw new Error(`Invalid JSON response from AI agent: ${result.body}`);
                }

                logInfo('AI agent response received', {phoneNumber, responseLength: body.ai_response?.length});
                return body.ai_response || 'AI agent processed the message successfully.';
            } else {
                // Handle error cases
                let errorBody;
                try {
                    errorBody = result.body ? JSON.parse(result.body) : {error: 'Unknown error'};
                } catch (parseError) {
                    errorBody = {error: result.body || 'Unknown error'};
                }
                throw new Error(`AI agent failed: ${errorBody.error || 'Unknown error'}`);
            }
        } else {
            throw new Error('No response payload from AI agent');
        }
    } catch (error) {
        logError('Error invoking Python AI agent', error);
        throw new ValidationError(`Failed to process message through AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions to convert between database and GraphQL formats
function dbCustomerToGraphQL(dbCustomer: any): Customer {
    return {
        phoneNumber: dbCustomer.phone_number,
        firstName: dbCustomer.first_name,
        lastName: dbCustomer.last_name,
        mostRecentCampaignId: dbCustomer.most_recent_campaign_id,
        status: dbCustomer.status,
        createdAt: dbCustomer.created_at,
        updatedAt: dbCustomer.updated_at,
    };
}

function dbCampaignToGraphQL(dbCampaign: DbCampaign): Campaign {
    const positiveResponseCount = dbCampaign.positive_response_count || 0;
    const neutralResponseCount = dbCampaign.neutral_response_count || 0;
    const negativeResponseCount = dbCampaign.negative_response_count || 0;
    const totalResponses = positiveResponseCount + neutralResponseCount + negativeResponseCount;
    const positiveResponseRate = Math.round(positiveResponseCount / totalResponses * 100);
    const neutralResponseRate = Math.round(neutralResponseCount / totalResponses * 100);
    const negativeResponseRate = Math.round(negativeResponseCount / totalResponses * 100);
    
    return {
        campaignId: dbCampaign.campaign_id,
        name: dbCampaign.name,
        messageTemplate: dbCampaign.message_template,
        campaignDetails: dbCampaign.campaign_details,
        totalContacts: dbCampaign.total_contacts,
        sentCount: dbCampaign.sent_count,
        responseCount: dbCampaign.response_count || 0,
        positiveHandoffCount: dbCampaign.positive_handoff_count || 0,
        neutralHandoffCount: dbCampaign.neutral_handoff_count || 0,
        negativeHandoffCount: dbCampaign.negative_handoff_count || 0,
        positiveResponseCount: positiveResponseCount,
        neutralResponseCount: neutralResponseCount,
        negativeResponseCount: negativeResponseCount,
        positiveResponseRate: positiveResponseRate,
        neutralResponseRate: neutralResponseRate,
        negativeResponseRate: negativeResponseRate,
        firstResponsePositiveCount: dbCampaign.first_response_positive_count || 0,
        firstResponseNeutralCount: dbCampaign.first_response_neutral_count || 0,
        firstResponseNegativeCount: dbCampaign.first_response_negative_count || 0,
        createdAt: dbCampaign.created_at,
    };
}

function dbMessageToGraphQL(dbMessage: any): ChatMessage {
    return {
        id: dbMessage.id,
        phoneNumber: dbMessage.phone_number,
        campaignId: dbMessage.campaign_id,
        message: dbMessage.message,
        direction: dbMessage.direction,
        timestamp: dbMessage.timestamp,
        responseType: dbMessage.response_type,
    };
}

export const resolvers = {
    Query: {
        getCustomer: async (_: any, {phoneNumber}: { phoneNumber: string }): Promise<Customer | null> => {
            try {
                logInfo('Getting customer', {phoneNumber});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                const dbCustomer = await CustomerModel.findByPhoneNumber(normalizedPhone);

                const result = dbCustomer ? dbCustomerToGraphQL(dbCustomer) : null;
                logInfo('Customer retrieved', {phoneNumber, found: !!result});

                return result;
            } catch (error) {
                logError('Error getting customer', error);
                throw error;
            }
        },

        listCustomersNeedingResponse: async (): Promise<Customer[]> => {
            try {
                logInfo('Listing customers needing response');

                const dbCustomers = await CustomerModel.findByStatus('needs_response');
                const result = dbCustomers.map(dbCustomerToGraphQL);

                logInfo('Customers needing response retrieved', {count: result.length});
                return result;
            } catch (error) {
                logError('Error listing customers needing response', error);
                throw error;
            }
        },

        listAllCustomers: async (): Promise<Customer[]> => {
            try {
                logInfo('Listing all customers');

                const dbCustomers = await CustomerModel.findAll();
                const result = dbCustomers.map(dbCustomerToGraphQL);

                logInfo('All customers retrieved', {count: result.length});
                return result;
            } catch (error) {
                logError('Error listing all customers', error);
                throw error;
            }
        },

        getCampaign: async (_: any, {campaignId}: { campaignId: string }): Promise<Campaign | null> => {
            try {
                logInfo('Getting campaign', {campaignId});

                const dbCampaign = await CampaignModel.findById(campaignId);
                const result = dbCampaign ? dbCampaignToGraphQL(dbCampaign) : null;

                logInfo('Campaign retrieved', {campaignId, found: !!result});
                return result;
            } catch (error) {
                logError('Error getting campaign', error);
                throw error;
            }
        },

        listCampaigns: async (): Promise<Campaign[]> => {
            try {
                logInfo('Listing campaigns');

                const dbCampaigns = await CampaignModel.findAll();
                const result = dbCampaigns.map(dbCampaignToGraphQL).sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                logInfo('Campaigns retrieved', {count: result.length});
                return result;
            } catch (error) {
                logError('Error listing campaigns', error);
                throw error;
            }
        },

        getChatHistory: async (_: any, {phoneNumber}: { phoneNumber: string }): Promise<ChatMessage[]> => {
            try {
                logInfo('Getting chat history', {phoneNumber});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                const dbMessages = await ChatMessageModel.findByPhoneNumber(normalizedPhone);
                const result = dbMessages.map(dbMessageToGraphQL);

                logInfo('Chat history retrieved', {phoneNumber, messageCount: result.length});
                return result;
            } catch (error) {
                logError('Error getting chat history', error);
                throw error;
            }
        },

        getAllMessages: async (_: any, {limit}: { limit?: number }): Promise<ChatMessage[]> => {
            try {
                logInfo('Getting all messages', {limit});

                const dbMessages = await ChatMessageModel.findAll(limit);
                const result = dbMessages.map(dbMessageToGraphQL);

                logInfo('All messages retrieved', {count: result.length, limit});
                return result;
            } catch (error) {
                logError('Error getting all messages', error);
                throw error;
            }
        },

        getPrefilledMeetingMessage: async (_: any, {phoneNumber}: { phoneNumber: string }): Promise<string> => {
            try {
                logInfo('Getting prefilled meeting message', {phoneNumber});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                const dbCustomer = await CustomerModel.findByPhoneNumber(normalizedPhone);

                if (!dbCustomer) {
                    throw new ValidationError('Customer not found', 'phoneNumber');
                }

                // Generate meeting URL with prefilled customer information
                const calendlyBaseUrl = process.env.CALENDLY_URL;
                if (!calendlyBaseUrl) {
                    throw new Error('CALENDLY_URL environment variable is not configured');
                }

                const encodedName = encodeURIComponent(`${dbCustomer.first_name} ${dbCustomer.last_name}`);
                const meetingTopic = encodeURIComponent('Meeting Discussion');
                const meetingUrl = `${calendlyBaseUrl}?name=${encodedName}&a1=${meetingTopic}`;

                // Create personalized message
                const message = `Hi ${dbCustomer.first_name}, let's schedule a meeting to discuss your interest. Please book a time that works for you: ${meetingUrl}`;

                logInfo('Prefilled meeting message generated', {phoneNumber, customerName: `${dbCustomer.first_name} ${dbCustomer.last_name}`});
                return message;
            } catch (error) {
                logError('Error getting prefilled meeting message', error);
                throw error;
            }
        },
    },

    Mutation: {
        createCampaign: async (_: any, {input}: { input: CreateCampaignInput }): Promise<Campaign> => {
            try {
                logInfo('Creating campaign', {input});

                if (!input.name || input.name.trim().length === 0) {
                    throw new ValidationError('Campaign name is required', 'name');
                }

                if (!input.messageTemplate || input.messageTemplate.trim().length === 0) {
                    throw new ValidationError('Message template is required', 'messageTemplate');
                }

                const dbCampaign = await CampaignModel.create({
                    name: input.name.trim(),
                    message_template: input.messageTemplate.trim(),
                    campaign_details: input.campaignDetails?.trim(),
                    total_contacts: 0,
                    sent_count: 0,
                    response_count: 0,
                    positive_handoff_count: 0,
                    neutral_handoff_count: 0,
                    negative_handoff_count: 0,
                    positive_response_count: 0,
                    neutral_response_count: 0,
                    negative_response_count: 0,
                    first_response_positive_count: 0,
                    first_response_neutral_count: 0,
                    first_response_negative_count: 0,
                });

                const result = dbCampaignToGraphQL(dbCampaign);
                logInfo('Campaign created', {campaignId: result.campaignId, name: result.name});

                return result;
            } catch (error) {
                logError('Error creating campaign', error);
                throw error;
            }
        },

        updateCampaign: async (_: any, {input}: { input: { campaignId: string, campaignDetails?: string } }): Promise<Campaign> => {
            try {
                logInfo('Updating campaign', {input});

                const {campaignId, campaignDetails} = input;

                // Validate campaign exists
                const existingCampaign = await CampaignModel.findById(campaignId);
                if (!existingCampaign) {
                    throw new ValidationError('Campaign not found', 'campaignId');
                }

                // Only allow updating campaign details
                const updates: any = {};
                if (campaignDetails !== undefined) {
                    updates.campaign_details = campaignDetails?.trim();
                }

                if (Object.keys(updates).length === 0) {
                    throw new ValidationError('No valid fields to update', 'input');
                }

                // Add updated timestamp
                updates.updated_at = new Date().toISOString();

                const updatedCampaign = await CampaignModel.update(campaignId, updates);
                if (!updatedCampaign) {
                    throw new ValidationError('Failed to update campaign', 'campaignId');
                }

                const result = dbCampaignToGraphQL(updatedCampaign);
                logInfo('Campaign updated', {campaignId: result.campaignId, name: result.name});

                return result;
            } catch (error) {
                logError('Error updating campaign', error);
                throw error;
            }
        },

        sendCampaign: async (_: any, {campaignId}: { campaignId: string }): Promise<Campaign> => {
            try {
                logInfo('Sending campaign via SNS', {campaignId});

                const campaign = await CampaignModel.findById(campaignId);
                if (!campaign) {
                    throw new ValidationError('Campaign not found', 'campaignId');
                }

                // Send campaign via SQS
                const sqsResult = await sendCampaignViaSQS(campaignId);

                const updatedCampaign = await CampaignModel.findById(campaignId);
                const result = dbCampaignToGraphQL(updatedCampaign!);

                logInfo('Campaign sent successfully via SQS', {
                    campaignId,
                    totalCustomers: sqsResult.totalCustomers,
                    totalQueued: sqsResult.totalQueued,
                    campaignType: sqsResult.campaignType,
                });

                return result;
            } catch (error) {
                logError('Error sending campaign via SQS', error);
                throw error;
            }
        },

        sendManualMessage: async (_: any, {phoneNumber, message}: {
            phoneNumber: string,
            message: string
        }): Promise<ChatMessage> => {
            try {
                logInfo('Sending manual message', {phoneNumber, message});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                if (!message || message.trim().length === 0) {
                    throw new ValidationError('Message is required', 'message');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);

                // Get customer to ensure they exist
                const customer = await CustomerModel.findByPhoneNumber(normalizedPhone);
                if (!customer) {
                    throw new ValidationError('Customer not found', 'phoneNumber');
                }

                // Store manual message in chat history
                const dbMessage = await ChatMessageModel.create({
                    phone_number: normalizedPhone,
                    message: message.trim(),
                    direction: 'outbound',
                    response_type: 'manual',
                });

                // Send message to SQS for actual SMS delivery
                await sendManualMessageToSQS(normalizedPhone, message.trim(), dbMessage.id);

                // Update customer status to agent_responding
                await CustomerModel.update(normalizedPhone, {status: 'agent_responding'});

                const result = dbMessageToGraphQL(dbMessage);
                logInfo('Manual message sent', {phoneNumber, messageId: result.id});

                return result;
            } catch (error) {
                logError('Error sending manual message', error);
                throw error;
            }
        },

        updateCustomerStatus: async (_: any, {phoneNumber, status}: {
            phoneNumber: string,
            status: string
        }): Promise<Customer> => {
            try {
                logInfo('Updating customer status', {phoneNumber, status});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                const validStatuses = ['automated', 'needs_response', 'agent_responding'];
                if (!validStatuses.includes(status)) {
                    throw new ValidationError('Invalid status', 'status');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);

                const dbStatus = status.toLowerCase();
                const updatedCustomer = await CustomerModel.update(normalizedPhone, {status: dbStatus as any});
                if (!updatedCustomer) {
                    throw new ValidationError('Customer not found', 'phoneNumber');
                }

                const result = dbCustomerToGraphQL(updatedCustomer);
                logInfo('Customer status updated', {phoneNumber, status: result.status});

                return result;
            } catch (error) {
                logError('Error updating customer status', error);
                throw error;
            }
        },

        simulateInboundMessage: async (_: any, {phoneNumber, message}: {
            phoneNumber: string,
            message: string
        }): Promise<ChatMessage> => {
            try {
                logInfo('Processing inbound message through AI agent', {phoneNumber, message});

                if (!validatePhoneNumber(phoneNumber)) {
                    throw new ValidationError('Invalid phone number format', 'phoneNumber');
                }

                if (!message || message.trim().length === 0) {
                    throw new ValidationError('Message is required', 'message');
                }

                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                const trimmedMessage = message.trim();

                // Invoke Python AI agent Lambda - it handles storing inbound message, 
                // processing with AI, storing response, and updating customer status
                const aiResponse = await invokePythonAgent(normalizedPhone, trimmedMessage);

                // Create a ChatMessage representing the AI response
                // We return the AI response rather than the original inbound message
                // since that's what the user wants to see - the AI agent's reply
                const responseMessage: ChatMessage = {
                    id: `ai-response-${Date.now()}`, // Temporary ID for GraphQL response
                    phoneNumber: normalizedPhone,
                    campaignId: undefined,
                    message: aiResponse,
                    direction: 'outbound',
                    timestamp: new Date().toISOString(),
                    responseType: 'automated'
                };

                logInfo('AI agent processing completed', {
                    phoneNumber,
                    aiResponseLength: aiResponse.length,
                    messageId: responseMessage.id
                });

                return responseMessage;

            } catch (error) {
                logError('Error processing inbound message through AI agent', error);
                throw error;
            }
        },

        clearAllData: async (): Promise<boolean> => {
            try {
                logInfo('Clearing all database data');

                await DatabaseUtils.clearAllData();

                logInfo('Database cleared successfully');
                return true;
            } catch (error) {
                logError('Error clearing database', error);
                throw new ValidationError(`Failed to clear database: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
    },

    // Field resolvers
    Customer: {
        chatHistory: async (parent: Customer): Promise<ChatMessage[]> => {
            try {
                const dbMessages = await ChatMessageModel.findByPhoneNumber(parent.phoneNumber);
                return dbMessages.map(dbMessageToGraphQL);
            } catch (error) {
                logError('Error getting customer chat history', error);
                return [];
            }
        },
    },
};