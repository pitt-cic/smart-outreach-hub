import {QueryResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {dbCustomerToGraphQL} from '../../shared/helpers';

export const listAllCustomers: QueryResolvers['listAllCustomers'] = async () => {
    try {
        logInfo('Listing all customers');

        const dbCustomers = await CustomerModel.findAll();
        const result = dbCustomers.map(dbCustomerToGraphQL);

        logInfo('All customers retrieved', {count: result.length});
        return result;
    } catch (error) {
        logError('Error listing all customers', error);
        throw error;
    }
};
