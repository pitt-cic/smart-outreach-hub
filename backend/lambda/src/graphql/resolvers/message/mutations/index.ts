import {MutationResolvers} from '../../../types/generated';
import {sendManualMessage} from "./sendManualMessage";

export const messageMutations: Pick<MutationResolvers, 'sendManualMessage'> = {
    sendManualMessage,
};
