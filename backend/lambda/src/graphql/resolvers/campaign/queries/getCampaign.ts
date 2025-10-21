import {QueryResolvers} from '../../../types/generated';
import {CampaignModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {dbCampaignToGraphQL} from '../../shared/helpers';

export const getCampaign: QueryResolvers['getCampaign'] = async (_parent, {campaignId}) => {
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
};
