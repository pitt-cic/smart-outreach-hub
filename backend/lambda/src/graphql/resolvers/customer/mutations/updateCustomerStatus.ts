import {MutationResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/database';
import {logError, logInfo, normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {dbCustomerToGraphQL} from '../../shared/helpers';

export const updateCustomerStatus: MutationResolvers['updateCustomerStatus'] = async (_parent, {phoneNumber, status}) => {
    try {
        logInfo('Updating customer status', {phoneNumber, status});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        const validStatuses = ['automated', 'needs_response', 'agent_responding'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid status', 'status');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);

        const dbStatus = status.toLowerCase();
        const updatedCustomer = await CustomerModel.update(normalizedPhone, {status: dbStatus as any});
        if (!updatedCustomer) {
            throw new ValidationError('Customer not found', 'phoneNumber');
        }

        const result = dbCustomerToGraphQL(updatedCustomer);
        logInfo('Customer status updated', {phoneNumber, status: result.status});

        return result;
    } catch (error) {
        logError('Error updating customer status', error);
        throw error;
    }
};
