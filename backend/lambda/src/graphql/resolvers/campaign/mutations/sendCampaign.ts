import {MutationResolvers} from '../../../types/generated';
import {CampaignModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {ValidationError} from '../../../../shared/types';
import {sendCampaignViaSQS} from '../../../../shared/sqs-service';
import {dbCampaignToGraphQL} from '../../shared/helpers';

export const sendCampaign: MutationResolvers['sendCampaign'] = async (_parent, {campaignId}) => {
    try {
        logInfo('Sending campaign via SNS', {campaignId});

        const campaign = await CampaignModel.findById(campaignId);
        if (!campaign) {
            throw new ValidationError('Campaign not found', 'campaignId');
        }

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
};
