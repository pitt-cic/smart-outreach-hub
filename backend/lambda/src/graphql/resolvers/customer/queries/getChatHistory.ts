import {QueryResolvers} from '../../../types/generated';
import {ChatMessageModel} from '../../../../shared/dynamodb';
import {logError, logInfo} from '../../../../shared/log-utils';
import {normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {dbMessageToGraphQL} from '../../shared/helpers';

export const getChatHistory: QueryResolvers['getChatHistory'] = async (_parent, {phoneNumber}) => {
    try {
        logInfo('Getting chat history', {phoneNumber});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const dbMessages = await ChatMessageModel.findByPhoneNumber(normalizedPhone);
        const result = dbMessages.map(dbMessageToGraphQL);

        logInfo('Chat history retrieved', {phoneNumber, messageCount: result.length});
        return result;
    } catch (error) {
        logError('Error getting chat history', error);
        throw error;
    }
};
