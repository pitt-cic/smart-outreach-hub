import {Resolvers} from '../types/generated';
import {customerQueries, customerMutations, customerFields} from './customer';
import {campaignQueries, campaignMutations} from './campaign';
import {messageQueries} from './message';
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
        ...sharedMutations,
    },

    Customer: customerFields,
};
