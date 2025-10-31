import {MutationResolvers} from '../../../types/generated';
import {updateCustomerStatus} from './updateCustomerStatus';

export const customerMutations: Pick<MutationResolvers, 'updateCustomerStatus'> = {
    updateCustomerStatus,
};
