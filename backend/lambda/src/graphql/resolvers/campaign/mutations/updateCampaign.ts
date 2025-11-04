import {MutationResolvers} from '../../../types/generated';
import {CampaignModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {dbCampaignToGraphQL} from '../../shared/helpers';

export const updateCampaign: MutationResolvers['updateCampaign'] = async (_parent, {input}) => {
    try {
        logInfo('Updating campaign', {input});

        const {campaignId, campaignDetails} = input;

        const existingCampaign = await CampaignModel.findById(campaignId);
        if (!existingCampaign) {
            throw new ValidationError('Campaign not found', 'campaignId');
        }

        const updates: any = {};
        if (campaignDetails !== undefined) {
            updates.campaign_details = campaignDetails?.trim();
        }

        if (Object.keys(updates).length === 0) {
            throw new ValidationError('No valid fields to update', 'input');
        }

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
};
