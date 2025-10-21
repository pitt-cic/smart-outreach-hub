import {MutationResolvers} from '../../../types/generated';
import {updateCustomerStatus} from './updateCustomerStatus';
import {sendManualMessage} from './sendManualMessage';
import {simulateInboundMessage} from './simulateInboundMessage';

export const customerMutations: Pick<MutationResolvers, 'updateCustomerStatus' | 'sendManualMessage' | 'simulateInboundMessage'> = {
    updateCustomerStatus,
    sendManualMessage,
    simulateInboundMessage,
};
