import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Campaign = {
  __typename?: 'Campaign';
  campaignDetails?: Maybe<Scalars['String']['output']>;
  campaignId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  firstResponseNegativeCount: Scalars['Int']['output'];
  firstResponseNeutralCount: Scalars['Int']['output'];
  firstResponsePositiveCount: Scalars['Int']['output'];
  messageTemplate: Scalars['String']['output'];
  name: Scalars['String']['output'];
  negativeHandoffCount: Scalars['Int']['output'];
  negativeResponseCount: Scalars['Int']['output'];
  negativeResponseRate: Scalars['Float']['output'];
  neutralHandoffCount: Scalars['Int']['output'];
  neutralResponseCount: Scalars['Int']['output'];
  neutralResponseRate: Scalars['Float']['output'];
  positiveHandoffCount: Scalars['Int']['output'];
  positiveResponseCount: Scalars['Int']['output'];
  positiveResponseRate: Scalars['Float']['output'];
  responseCount: Scalars['Int']['output'];
  sentCount: Scalars['Int']['output'];
  totalContacts: Scalars['Int']['output'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  campaignId?: Maybe<Scalars['String']['output']>;
  direction: MessageDirection;
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  responseType?: Maybe<ResponseType>;
  timestamp: Scalars['String']['output'];
};

export type ContactInput = {
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};

export type CreateCampaignInput = {
  campaignDetails?: InputMaybe<Scalars['String']['input']>;
  messageTemplate: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type Customer = {
  __typename?: 'Customer';
  chatHistory: Array<ChatMessage>;
  createdAt: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  mostRecentCampaignId?: Maybe<Scalars['String']['output']>;
  phoneNumber: Scalars['String']['output'];
  status: CustomerStatus;
  updatedAt: Scalars['String']['output'];
};

export type CustomerStatus =
  | 'agent_responding'
  | 'automated'
  | 'needs_response';

export type MessageDirection =
  | 'inbound'
  | 'outbound';

export type Mutation = {
  __typename?: 'Mutation';
  clearAllData: Scalars['Boolean']['output'];
  createCampaign: Campaign;
  sendCampaign: Campaign;
  sendManualMessage: ChatMessage;
  simulateInboundMessage: ChatMessage;
  updateCampaign: Campaign;
  updateCustomerStatus: Customer;
};


export type MutationCreateCampaignArgs = {
  input: CreateCampaignInput;
};


export type MutationSendCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationSendManualMessageArgs = {
  message: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};


export type MutationSimulateInboundMessageArgs = {
  message: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};


export type MutationUpdateCampaignArgs = {
  input: UpdateCampaignInput;
};


export type MutationUpdateCustomerStatusArgs = {
  phoneNumber: Scalars['String']['input'];
  status: CustomerStatus;
};

export type Query = {
  __typename?: 'Query';
  getAllMessages: Array<ChatMessage>;
  getCampaign?: Maybe<Campaign>;
  getChatHistory: Array<ChatMessage>;
  getCustomer?: Maybe<Customer>;
  getPrefilledMeetingMessage?: Maybe<Scalars['String']['output']>;
  listAllCustomers: Array<Customer>;
  listCampaigns: Array<Campaign>;
  listCustomersNeedingResponse: Array<Customer>;
};


export type QueryGetAllMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type QueryGetChatHistoryArgs = {
  phoneNumber: Scalars['String']['input'];
};


export type QueryGetCustomerArgs = {
  phoneNumber: Scalars['String']['input'];
};


export type QueryGetPrefilledMeetingMessageArgs = {
  phoneNumber: Scalars['String']['input'];
};

export type ResponseType =
  | 'ai_agent'
  | 'automated'
  | 'manual';

export type UpdateCampaignInput = {
  campaignDetails?: InputMaybe<Scalars['String']['input']>;
  campaignId: Scalars['ID']['input'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Partial<Scalars['Boolean']['output']>>;
  Campaign: ResolverTypeWrapper<Partial<Campaign>>;
  ChatMessage: ResolverTypeWrapper<Partial<ChatMessage>>;
  ContactInput: ResolverTypeWrapper<Partial<ContactInput>>;
  CreateCampaignInput: ResolverTypeWrapper<Partial<CreateCampaignInput>>;
  Customer: ResolverTypeWrapper<Partial<Customer>>;
  CustomerStatus: ResolverTypeWrapper<Partial<CustomerStatus>>;
  Float: ResolverTypeWrapper<Partial<Scalars['Float']['output']>>;
  ID: ResolverTypeWrapper<Partial<Scalars['ID']['output']>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  MessageDirection: ResolverTypeWrapper<Partial<MessageDirection>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ResponseType: ResolverTypeWrapper<Partial<ResponseType>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  UpdateCampaignInput: ResolverTypeWrapper<Partial<UpdateCampaignInput>>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Partial<Scalars['Boolean']['output']>;
  Campaign: Partial<Campaign>;
  ChatMessage: Partial<ChatMessage>;
  ContactInput: Partial<ContactInput>;
  CreateCampaignInput: Partial<CreateCampaignInput>;
  Customer: Partial<Customer>;
  Float: Partial<Scalars['Float']['output']>;
  ID: Partial<Scalars['ID']['output']>;
  Int: Partial<Scalars['Int']['output']>;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  String: Partial<Scalars['String']['output']>;
  UpdateCampaignInput: Partial<UpdateCampaignInput>;
}>;

export type CampaignResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Campaign'] = ResolversParentTypes['Campaign']> = ResolversObject<{
  campaignDetails?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  campaignId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstResponseNegativeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstResponseNeutralCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  firstResponsePositiveCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  messageTemplate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  negativeHandoffCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  negativeResponseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  negativeResponseRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  neutralHandoffCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  neutralResponseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  neutralResponseRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  positiveHandoffCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  positiveResponseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  positiveResponseRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  responseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalContacts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ChatMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ChatMessage'] = ResolversParentTypes['ChatMessage']> = ResolversObject<{
  campaignId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['MessageDirection'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  responseType?: Resolver<Maybe<ResolversTypes['ResponseType']>, ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CustomerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  chatHistory?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mostRecentCampaignId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  clearAllData?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createCampaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<MutationCreateCampaignArgs, 'input'>>;
  sendCampaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<MutationSendCampaignArgs, 'campaignId'>>;
  sendManualMessage?: Resolver<ResolversTypes['ChatMessage'], ParentType, ContextType, RequireFields<MutationSendManualMessageArgs, 'message' | 'phoneNumber'>>;
  simulateInboundMessage?: Resolver<ResolversTypes['ChatMessage'], ParentType, ContextType, RequireFields<MutationSimulateInboundMessageArgs, 'message' | 'phoneNumber'>>;
  updateCampaign?: Resolver<ResolversTypes['Campaign'], ParentType, ContextType, RequireFields<MutationUpdateCampaignArgs, 'input'>>;
  updateCustomerStatus?: Resolver<ResolversTypes['Customer'], ParentType, ContextType, RequireFields<MutationUpdateCustomerStatusArgs, 'phoneNumber' | 'status'>>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getAllMessages?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, Partial<QueryGetAllMessagesArgs>>;
  getCampaign?: Resolver<Maybe<ResolversTypes['Campaign']>, ParentType, ContextType, RequireFields<QueryGetCampaignArgs, 'campaignId'>>;
  getChatHistory?: Resolver<Array<ResolversTypes['ChatMessage']>, ParentType, ContextType, RequireFields<QueryGetChatHistoryArgs, 'phoneNumber'>>;
  getCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<QueryGetCustomerArgs, 'phoneNumber'>>;
  getPrefilledMeetingMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryGetPrefilledMeetingMessageArgs, 'phoneNumber'>>;
  listAllCustomers?: Resolver<Array<ResolversTypes['Customer']>, ParentType, ContextType>;
  listCampaigns?: Resolver<Array<ResolversTypes['Campaign']>, ParentType, ContextType>;
  listCustomersNeedingResponse?: Resolver<Array<ResolversTypes['Customer']>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Campaign?: CampaignResolvers<ContextType>;
  ChatMessage?: ChatMessageResolvers<ContextType>;
  Customer?: CustomerResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
}>;

