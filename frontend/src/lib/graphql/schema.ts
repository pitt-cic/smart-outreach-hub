import {makeExecutableSchema} from '@graphql-tools/schema';

export const typeDefs = `
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
    totalContacts: Int!
    sentCount: Int!
    responseCount: Int!
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
  }

  type Query {
    getCustomer(phoneNumber: String!): Customer
    listCustomersNeedingResponse: [Customer!]!
    listAllCustomers: [Customer!]!
    getCampaign(campaignId: ID!): Campaign
    listCampaigns: [Campaign!]!
    getChatHistory(phoneNumber: String!): [ChatMessage!]!
    getAllMessages(limit: Int): [ChatMessage!]!
  }

  type Mutation {
    createCampaign(input: CreateCampaignInput!): Campaign!
    sendCampaign(campaignId: ID!): Campaign!
    sendManualMessage(phoneNumber: String!, message: String!): ChatMessage!
    updateCustomerStatus(phoneNumber: String!, status: CustomerStatus!): Customer!
    simulateInboundMessage(phoneNumber: String!, message: String!): ChatMessage!
    clearAllData: Boolean!
  }

`;

export const schema = makeExecutableSchema({
    typeDefs,
});
