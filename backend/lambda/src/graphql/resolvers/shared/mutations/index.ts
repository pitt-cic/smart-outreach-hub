import {MutationResolvers} from '../../../types/generated';
import {clearAllData} from './clearAllData';

export const sharedMutations: Pick<MutationResolvers, 'clearAllData'> = {
    clearAllData,
};
