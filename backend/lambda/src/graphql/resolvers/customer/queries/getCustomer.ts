import {QueryResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/database';
import {logError, logInfo, normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {dbCustomerToGraphQL} from '../../shared/helpers';

export const getCustomer: QueryResolvers['getCustomer'] = async (_parent, {phoneNumber}) => {
    try {
        logInfo('Getting customer', {phoneNumber});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const dbCustomer = await CustomerModel.findByPhoneNumber(normalizedPhone);

        const result = dbCustomer ? dbCustomerToGraphQL(dbCustomer) : null;
        logInfo('Customer retrieved', {phoneNumber, found: !!result});

        return result;
    } catch (error) {
        logError('Error getting customer', error);
        throw error;
    }
};
