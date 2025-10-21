import {QueryResolvers} from '../../../types/generated';
import {ChatMessageModel} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {dbMessageToGraphQL} from '../../shared/helpers';

export const getAllMessages: QueryResolvers['getAllMessages'] = async (_parent, {limit}) => {
    try {
        logInfo('Getting all messages', {limit});

        const dbMessages = await ChatMessageModel.findAll(limit ?? undefined);
        const result = dbMessages.map(dbMessageToGraphQL);

        logInfo('All messages retrieved', {count: result.length, limit});
        return result;
    } catch (error) {
        logError('Error getting all messages', error);
        throw error;
    }
};
