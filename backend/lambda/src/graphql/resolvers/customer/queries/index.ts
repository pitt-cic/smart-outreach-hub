import {QueryResolvers} from '../../../types/generated';
import {getCustomer} from './getCustomer';
import {listCustomersNeedingResponse} from './listCustomersNeedingResponse';
import {listAllCustomers} from './listAllCustomers';
import {listCustomersByStatus} from './listCustomersByStatus';
import {getChatHistory} from './getChatHistory';
import {getPrefilledMeetingMessage} from './getPrefilledMeetingMessage';

export const customerQueries: Pick<QueryResolvers,
    'getCustomer' | 'listCustomersNeedingResponse' | 'listAllCustomers' |
    'listCustomersByStatus' | 'getChatHistory' | 'getPrefilledMeetingMessage'
> = {
    getCustomer,
    listCustomersNeedingResponse,
    listAllCustomers,
    listCustomersByStatus,
    getChatHistory,
    getPrefilledMeetingMessage,
};
