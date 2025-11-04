import {DbCampaign, ValidationError} from '../../../shared/types';
import {Campaign, ChatMessage, Customer} from '../../types/generated';
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';
import {logError, logInfo} from '../../../shared/utils';

export const lambdaClient = new LambdaClient({region: process.env.AWS_REGION || 'us-east-1'});

export async function invokePythonAgent(phoneNumber: string, message: string): Promise<string> {
    const payload = {
        phone_number: phoneNumber,
        message: message
    };

    const command = new InvokeCommand({
        FunctionName: 'outreach-ai-agent',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(payload)
    });

    try {
        logInfo('Invoking Python AI agent', {phoneNumber, messageLength: message.length});

        const response = await lambdaClient.send(command);

        if (response.Payload) {
            const result = JSON.parse(new TextDecoder().decode(response.Payload));
            logInfo('Raw AI agent response', {result});

            if (result.statusCode === 200) {
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

export function dbCustomerToGraphQL(dbCustomer: any): Omit<Customer, 'chatHistory'> {
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

export function dbCampaignToGraphQL(dbCampaign: DbCampaign): Campaign {
    const positiveResponseCount = dbCampaign.positive_response_count || 0;
    const neutralResponseCount = dbCampaign.neutral_response_count || 0;
    const negativeResponseCount = dbCampaign.negative_response_count || 0;
    const totalResponses = positiveResponseCount + neutralResponseCount + negativeResponseCount;
    let positiveResponseRate = 0;
    let neutralResponseRate = 0;
    let negativeResponseRate = 0;

    if (totalResponses > 0) {
        positiveResponseRate = Math.round(positiveResponseCount / totalResponses * 100);
        neutralResponseRate = Math.round(neutralResponseCount / totalResponses * 100);
        negativeResponseRate = Math.round(negativeResponseCount / totalResponses * 100);
    }

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

export function dbMessageToGraphQL(dbMessage: any): ChatMessage {
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
