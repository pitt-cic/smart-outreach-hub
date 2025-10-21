import {loadFilesSync} from '@graphql-tools/load-files';
import {mergeTypeDefs} from '@graphql-tools/merge';
import {print} from 'graphql';
import path from 'path';

/**
 * Load all .graphql files from the schema directory and subdirectories
 * This includes:
 * - shared/ (base types, scalars, enums, shared mutations)
 * - customer/ (customer types, queries, mutations)
 * - campaign/ (campaign types, queries, mutations, inputs)
 * - message/ (message types, queries, mutations)
 */
const typesArray = loadFilesSync(path.join(__dirname, './**/*.graphql'));

/**
 * Merge all type definitions into a single schema
 * This handles the 'extend type Query' and 'extend type Mutation' statements
 */
export const mergedTypeDefs = mergeTypeDefs(typesArray);

/**
 * Export as string for makeExecutableSchema compatibility
 * This can be used directly with @graphql-tools/schema's makeExecutableSchema
 */
export const typeDefsString = print(mergedTypeDefs);
