import {MutationResolvers} from '../../../types/generated';
import {createCampaign} from './createCampaign';
import {updateCampaign} from './updateCampaign';
import {sendCampaign} from './sendCampaign';

export const campaignMutations: Pick<MutationResolvers,
    'createCampaign' | 'updateCampaign' | 'sendCampaign'
> = {
    createCampaign,
    updateCampaign,
    sendCampaign,
};
