import {MutationResolvers} from '../../../types/generated';
import {DatabaseUtils} from '../../../../shared/database';
import {logError, logInfo} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';

export const clearAllData: MutationResolvers['clearAllData'] = async () => {
    try {
        logInfo('Clearing all database data');

        await DatabaseUtils.clearAllData();

        logInfo('Database cleared successfully');
        return true;
    } catch (error) {
        logError('Error clearing database', error);
        throw new ValidationError(`Failed to clear database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
