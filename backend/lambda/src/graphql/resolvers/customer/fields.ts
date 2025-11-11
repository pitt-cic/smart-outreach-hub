import {CustomerResolvers} from '../../types/generated';
import {ChatMessageModel} from '../../../shared/dynamodb';
import {logError} from '../../../shared/log-utils';
import {dbMessageToGraphQL} from '../shared/helpers';

export const customerFields: CustomerResolvers = {
    chatHistory: async (parent) => {
        try {
            const dbMessages = await ChatMessageModel.findByPhoneNumber(parent.phoneNumber!);
            return dbMessages.map(dbMessageToGraphQL);
        } catch (error) {
            logError('Error getting customer chat history', error);
            return [];
        }
    },
};
