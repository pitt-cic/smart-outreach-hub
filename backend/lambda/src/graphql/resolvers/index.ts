import {Resolvers} from '../types/generated';
import {customerFields, customerMutations, customerQueries} from './customer';
import {campaignMutations, campaignQueries} from './campaign';
import {messageMutations, messageQueries} from './message';
import {sharedMutations} from './shared/mutations';


export const resolvers: Resolvers = {
    Query: {
        ...customerQueries,
        ...campaignQueries,
        ...messageQueries,
    },

    Mutation: {
        ...customerMutations,
        ...campaignMutations,
        ...messageMutations,
        ...sharedMutations,
    },

    Customer: customerFields,
};
