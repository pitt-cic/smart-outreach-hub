/**
 * Schema Comparison Script
 *
 * Compares the old inline schema with the new .graphql file-based schema
 * to ensure they are functionally equivalent before migration.
 */

import {typeDefsString as newSchema} from './schema';
import {buildSchema, printSchema} from 'graphql';

// Old schema copied from lambda/src/functions/graphql/index.ts (lines 11-110)
const oldTypeDefs = `
  enum CustomerStatus {
    automated
    needs_response
    agent_responding
  }

  enum MessageDirection {
    outbound
    inbound
  }

  enum ResponseType {
    automated
    manual
    ai_agent
  }

  type Customer {
    phoneNumber: String!
    firstName: String!
    lastName: String!
    mostRecentCampaignId: String
    status: CustomerStatus!
    createdAt: String!
    updatedAt: String!
    chatHistory: [ChatMessage!]!
  }

  type ChatMessage {
    id: ID!
    phoneNumber: String!
    campaignId: String
    message: String!
    direction: MessageDirection!
    timestamp: String!
    responseType: ResponseType
  }

  type Campaign {
    campaignId: ID!
    name: String!
    messageTemplate: String!
    campaignDetails: String
    totalContacts: Int!
    sentCount: Int!
    responseCount: Int!
    positiveResponseCount: Int!
    neutralResponseCount: Int!
    negativeResponseCount: Int!
    positiveResponseRate: Float!
    neutralResponseRate: Float!
    negativeResponseRate: Float!
    positiveHandoffCount: Int!
    neutralHandoffCount: Int!
    negativeHandoffCount: Int!
    firstResponsePositiveCount: Int!
    firstResponseNeutralCount: Int!
    firstResponseNegativeCount: Int!
    createdAt: String!
  }

  input ContactInput {
    firstName: String!
    lastName: String!
    phoneNumber: String!
  }

  input CreateCampaignInput {
    name: String!
    messageTemplate: String!
    campaignDetails: String
  }

  input UpdateCampaignInput {
    campaignId: ID!
    campaignDetails: String
  }

  type Query {
    getCustomer(phoneNumber: String!): Customer
    listCustomersNeedingResponse: [Customer!]!
    listAllCustomers: [Customer!]!
    getCampaign(campaignId: ID!): Campaign
    listCampaigns: [Campaign!]!
    getChatHistory(phoneNumber: String!): [ChatMessage!]!
    getAllMessages(limit: Int): [ChatMessage!]!
    getPrefilledMeetingMessage(phoneNumber: String!): String
  }

  type Mutation {
    createCampaign(input: CreateCampaignInput!): Campaign!
    updateCampaign(input: UpdateCampaignInput!): Campaign!
    sendCampaign(campaignId: ID!): Campaign!
    sendManualMessage(phoneNumber: String!, message: String!): ChatMessage!
    updateCustomerStatus(phoneNumber: String!, status: CustomerStatus!): Customer!
    simulateInboundMessage(phoneNumber: String!, message: String!): ChatMessage!
    clearAllData: Boolean!
  }
`;

console.log('='.repeat(80));
console.log('GRAPHQL SCHEMA COMPARISON');
console.log('='.repeat(80));
console.log();

try {
    // Build both schemas
    const oldBuilt = buildSchema(oldTypeDefs);
    const newBuilt = buildSchema(newSchema);

    // Print normalized versions
    const oldNormalized = printSchema(oldBuilt);
    const newNormalized = printSchema(newBuilt);

    console.log('📄 OLD SCHEMA (Inline from index.ts):');
    console.log('-'.repeat(80));
    console.log(oldNormalized);
    console.log();

    console.log('📄 NEW SCHEMA (Merged from .graphql files):');
    console.log('-'.repeat(80));
    console.log(newNormalized);
    console.log();

    console.log('='.repeat(80));
    console.log('COMPARISON RESULT:');
    console.log('='.repeat(80));

    if (oldNormalized === newNormalized) {
        console.log('✅ SCHEMAS ARE IDENTICAL!');
        console.log('   The migration was successful - schemas match perfectly.');
        process.exit(0);
    } else {
        console.log('⚠️  SCHEMAS DIFFER!');
        console.log('   Please review the differences above.');
        console.log();
        console.log('💡 Tip: Use a diff tool to compare the two outputs:');
        console.log('   npx ts-node lambda/src/graphql/compare-schemas.ts > /tmp/schema-diff.txt');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
}
