import {MutationResolvers} from '../../../types/generated';
import {ChatMessageModel, CustomerModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {sendManualMessageToSQS} from '../../../../shared/sqs-service';
import {dbMessageToGraphQL} from '../../shared/helpers';

export const sendManualMessage: MutationResolvers['sendManualMessage'] = async (_parent, {phoneNumber, message}) => {
    try {
        logInfo('Sending manual message', {phoneNumber, message});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        if (!message || message.trim().length === 0) {
            throw new ValidationError('Message is required', 'message');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const customer = await CustomerModel.findByPhoneNumber(normalizedPhone);
        if (!customer) {
            throw new ValidationError('Customer not found', 'phoneNumber');
        }

        const dbMessage = await ChatMessageModel.create({
            phone_number: normalizedPhone,
            message: message.trim(),
            direction: 'outbound',
            response_type: 'manual',
        });

        await sendManualMessageToSQS(normalizedPhone, message.trim(), dbMessage.id);
        await CustomerModel.update(normalizedPhone, {status: 'agent_responding'});
        const result = dbMessageToGraphQL(dbMessage);
        logInfo('Manual message sent', {phoneNumber, messageId: result.id});
        return result;
    } catch (error) {
        logError('Error sending manual message', error);
        throw error;
    }
};
