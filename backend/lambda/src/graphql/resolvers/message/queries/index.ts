import {QueryResolvers} from '../../../types/generated';
import {getAllMessages} from './getAllMessages';

export const messageQueries: Pick<QueryResolvers, 'getAllMessages'> = {
    getAllMessages,
};
