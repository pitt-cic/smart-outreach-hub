import {QueryResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {dbCustomerToGraphQL} from '../../shared/helpers';

export const listCustomersByStatus: QueryResolvers['listCustomersByStatus'] = async (_, { status }) => {
    try {
        logInfo('Listing customers by status', { status });

        const dbCustomers = await CustomerModel.findByStatus(status);
        const result = dbCustomers.map(dbCustomerToGraphQL);

        logInfo(`Customers with ${status} retrieved`, {count: result.length});
        return result;
    } catch (error) {
        logError(`Error listing customers by status ${status}`, error);
        throw error;
    }
};