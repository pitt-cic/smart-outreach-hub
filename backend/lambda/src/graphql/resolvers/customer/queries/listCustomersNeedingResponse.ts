import {QueryResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {dbCustomerToGraphQL} from '../../shared/helpers';

export const listCustomersNeedingResponse: QueryResolvers['listCustomersNeedingResponse'] = async () => {
    try {
        logInfo('Listing customers needing response');

        const dbCustomers = await CustomerModel.findByStatus('needs_response');
        const result = dbCustomers.map(dbCustomerToGraphQL);

        logInfo('Customers needing response retrieved', {count: result.length});
        return result;
    } catch (error) {
        logError('Error listing customers needing response', error);
        throw error;
    }
};
