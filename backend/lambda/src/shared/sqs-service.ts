import {SendMessageBatchCommand, SQSClient} from '@aws-sdk/client-sqs';
import {CampaignModel, CustomerModel, CampaignCustomerModel} from './database';
import {hasPersonalizationPlaceholders, logInfo, personalizeMessage} from './utils';

const sqsClient = new SQSClient({region: process.env.AWS_REGION});

interface CampaignSendResult {
    totalCustomers: number;
    totalQueued: number;
    totalFailed: number;
    successfulBatches: number;
    failedBatches: number;
    campaignType: 'broadcast' | 'personalized';
}

interface CampaignMessage {
    phoneNumber: string;
    message: string;
    campaignId: string;
    customerId: string;
    messageType: 'campaign';
}

interface ManualMessage {
    phoneNumber: string;
    message: string;
    messageType: 'manual';
    messageId?: string;
}

export const sendCampaignViaSQS = async (campaignId: string): Promise<CampaignSendResult> => {
    logInfo('Starting campaign send via SQS', {campaignId});

    // Get campaign
    const campaign = await CampaignModel.findById(campaignId);
    if (!campaign) {
        throw new Error('Campaign not found');
    }

    // Get campaign customers efficiently using the new table
    const campaignCustomerRecords = await CampaignCustomerModel.findByCampaignId(campaignId);

    if (campaignCustomerRecords.length === 0) {
        throw new Error('No customers found for campaign');
    }

    // Extract phone numbers for batch customer lookup
    const phoneNumbers = campaignCustomerRecords.map(record => record.phone_number);

    // Build customer lookup map for efficient access (O(1) instead of O(n))
    const customerMap = new Map();

    // Process customers in chunks to handle large datasets efficiently
    const chunkSize = 1000; // Process 1000 customers at a time
    for (let i = 0; i < phoneNumbers.length; i += chunkSize) {
        const phoneChunk = phoneNumbers.slice(i, i + chunkSize);

        // Fetch customers for this chunk
        const customerPromises = phoneChunk.map(phone => CustomerModel.findByPhoneNumber(phone));
        const customers = await Promise.all(customerPromises);

        // Add to lookup map
        customers.forEach(customer => {
            if (customer) {
                customerMap.set(customer.phone_number, customer);
            }
        });

        logInfo(`Loaded customer chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(phoneNumbers.length/chunkSize)}`, {
            chunkSize: phoneChunk.length,
            loadedCustomers: customers.filter(c => c).length
        });
    }

    // Create final campaign customers list with full customer data
    const campaignCustomers = campaignCustomerRecords
        .map(record => customerMap.get(record.phone_number))
        .filter(customer => customer !== undefined);

    // Check if campaign has personalization placeholders
    const isPersonalized = hasPersonalizationPlaceholders(campaign.message_template);

    logInfo('Campaign processing', {
        campaignId,
        isPersonalized,
        customerCount: campaignCustomers.length,
        messageTemplate: campaign.message_template
    });

    // Update campaign status
    await CampaignModel.update(campaignId, {
        status: 'sending',
        updated_at: new Date().toISOString()
    });

    // Process customers in batches with per-batch database updates then SQS send
    const batchSize = 10;
    let totalQueued = 0;
    let totalFailed = 0;
    let successfulBatches = 0;
    let failedBatches = 0;

    for (let i = 0; i < campaignCustomers.length; i += batchSize) {
        const batch = campaignCustomers.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(campaignCustomers.length / batchSize);

        logInfo(`Processing batch ${batchIndex}/${totalBatches}`, {
            batchSize: batch.length,
            campaignId
        });

        try {
            // Step 1: Update customer records for this batch
            const customerUpdatePromises = batch.map(customer =>
                CustomerModel.update(customer.phone_number, {
                    most_recent_campaign_id: campaignId,
                    status: 'automated'
                }).catch(error => {
                    logInfo(`Failed to update customer ${customer.phone_number} in batch ${batchIndex}`, {error: error.message});
                    return null; // Continue with other updates even if one fails
                })
            );

            await Promise.all(customerUpdatePromises);

            // Step 2: Update campaign-customer records for this batch
            const campaignCustomerUpdatePromises = batch.map(customer =>
                CampaignCustomerModel.updateStatus(campaignId, customer.phone_number, 'processing').catch(error => {
                    logInfo(`Failed to update campaign-customer ${campaignId}:${customer.phone_number} in batch ${batchIndex}`, {error: error.message});
                    return null; // Continue with other updates even if one fails
                })
            );

            await Promise.all(campaignCustomerUpdatePromises);

            // Step 3: Prepare and send SQS messages for this batch
            const messages: CampaignMessage[] = [];

            for (const customer of batch) {
                let finalMessage = campaign.message_template;

                // Apply personalization if needed
                if (isPersonalized) {
                    finalMessage = personalizeMessage(
                        campaign.message_template,
                        customer.first_name,
                        customer.last_name
                    );
                }

                messages.push({
                    phoneNumber: customer.phone_number,
                    message: finalMessage,
                    campaignId,
                    customerId: customer.phone_number,
                    messageType: 'campaign'
                });
            }

            // Step 4: Send batch to SQS
            await sendCampaignMessageBatch(messages);

            totalQueued += messages.length;
            successfulBatches++;

            logInfo(`Successfully processed batch ${batchIndex}/${totalBatches}`, {
                batchSize: batch.length,
                totalQueued: totalQueued,
                campaignId
            });

        } catch (error) {
            // Log batch failure but continue with next batch
            logInfo(`Failed to process batch ${batchIndex}/${totalBatches}`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                batchSize: batch.length,
                campaignId
            });

            totalFailed += batch.length;
            failedBatches++;
        }

        // Rate limiting - small delay between batches
        if (i + batchSize < campaignCustomers.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // Update campaign with queued count
    await CampaignModel.update(campaignId, {
        sent_count: totalQueued,
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    logInfo('Campaign processing completed', {
        campaignId,
        totalCustomers: campaignCustomers.length,
        totalQueued,
        totalFailed,
        successfulBatches,
        failedBatches,
        isPersonalized
    });

    return {
        totalCustomers: campaignCustomers.length,
        totalQueued,
        totalFailed,
        successfulBatches,
        failedBatches,
        campaignType: isPersonalized ? 'personalized' : 'broadcast'
    };
};

async function sendCampaignMessageBatch(messages: CampaignMessage[]): Promise<void> {
    if (!process.env.CAMPAIGN_MESSAGE_QUEUE_URL) {
        throw new Error('CAMPAIGN_MESSAGE_QUEUE_URL environment variable not set');
    }

    const sqsMessages = messages.map((msg, index) => ({
        Id: `msg-${Date.now()}-${index}`,
        MessageBody: JSON.stringify(msg),
        MessageAttributes: {
            messageType: {
                DataType: 'String',
                StringValue: 'campaign'
            },
            campaignId: {
                DataType: 'String',
                StringValue: msg.campaignId
            }
        }
    }));

    await sqsClient.send(new SendMessageBatchCommand({
        QueueUrl: process.env.CAMPAIGN_MESSAGE_QUEUE_URL,
        Entries: sqsMessages
    }));

    logInfo('Sent campaign message batch to SQS', {
        batchSize: messages.length,
        queueUrl: process.env.CAMPAIGN_MESSAGE_QUEUE_URL
    });
}

export const sendManualMessageToSQS = async (phoneNumber: string, message: string, messageId?: string): Promise<void> => {
    if (!process.env.CAMPAIGN_MESSAGE_QUEUE_URL) {
        throw new Error('CAMPAIGN_MESSAGE_QUEUE_URL environment variable not set');
    }

    const manualMessage: ManualMessage = {
        phoneNumber,
        message,
        messageType: 'manual',
        messageId
    };

    const sqsMessage = {
        Id: `manual-${Date.now()}`,
        MessageBody: JSON.stringify(manualMessage),
        MessageAttributes: {
            messageType: {
                DataType: 'String',
                StringValue: 'manual'
            }
        }
    };

    await sqsClient.send(new SendMessageBatchCommand({
        QueueUrl: process.env.CAMPAIGN_MESSAGE_QUEUE_URL,
        Entries: [sqsMessage]
    }));

    logInfo('Sent manual message to SQS', {
        phoneNumber,
        messageId,
        queueUrl: process.env.CAMPAIGN_MESSAGE_QUEUE_URL
    });
};
