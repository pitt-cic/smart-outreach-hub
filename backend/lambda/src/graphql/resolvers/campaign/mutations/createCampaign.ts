import {MutationResolvers} from '../../../types/generated';
import {CampaignModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {dbCampaignToGraphQL} from '../../shared/helpers';

export const createCampaign: MutationResolvers['createCampaign'] = async (_parent, {input}) => {
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
};
