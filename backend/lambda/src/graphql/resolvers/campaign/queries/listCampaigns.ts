import {QueryResolvers} from '../../../types/generated';
import {CampaignModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {dbCampaignToGraphQL} from '../../shared/helpers';

export const listCampaigns: QueryResolvers['listCampaigns'] = async () => {
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
};
