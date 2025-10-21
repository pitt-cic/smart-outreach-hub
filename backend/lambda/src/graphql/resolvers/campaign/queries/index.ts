import {QueryResolvers} from '../../../types/generated';
import {getCampaign} from './getCampaign';
import {listCampaigns} from './listCampaigns';

export const campaignQueries: Pick<QueryResolvers, 'getCampaign' | 'listCampaigns'> = {
    getCampaign,
    listCampaigns,
};
