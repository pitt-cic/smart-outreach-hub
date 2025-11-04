import {QueryResolvers} from '../../../types/generated';
import {CustomerModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';

export const getPrefilledMeetingMessage: QueryResolvers['getPrefilledMeetingMessage'] = async (_parent, {phoneNumber}) => {
    try {
        logInfo('Getting prefilled meeting message', {phoneNumber});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const dbCustomer = await CustomerModel.findByPhoneNumber(normalizedPhone);

        if (!dbCustomer) {
            throw new ValidationError('Customer not found', 'phoneNumber');
        }

        const calendlyBaseUrl = process.env.CALENDLY_URL;
        if (!calendlyBaseUrl) {
            throw new Error('CALENDLY_URL environment variable is not configured');
        }

        const encodedName = encodeURIComponent(`${dbCustomer.first_name} ${dbCustomer.last_name}`);
        const meetingTopic = encodeURIComponent('Meeting Discussion');
        const meetingUrl = `${calendlyBaseUrl}?name=${encodedName}&a1=${meetingTopic}`;

        const message = `Hi ${dbCustomer.first_name}, let's schedule a meeting to discuss your interest. Please book a time that works for you: ${meetingUrl}`;

        logInfo('Prefilled meeting message generated', {
            phoneNumber,
            customerName: `${dbCustomer.first_name} ${dbCustomer.last_name}`
        });
        return message;
    } catch (error) {
        logError('Error getting prefilled meeting message', error);
        throw error;
    }
};
