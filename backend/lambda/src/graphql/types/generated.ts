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

/**
 * Represents an outreach campaign with comprehensive tracking metrics.
 *
 * A campaign is a coordinated effort to send personalized messages to a list
 * of contacts. It tracks delivery, responses, sentiment analysis, and handoff
 * events throughout the customer journey.
 */
export type Campaign = {
  __typename?: 'Campaign';
  /**
   * Optional additional context or notes about this campaign.
   * Can include campaign goals, target audience details, or special instructions.
   */
  campaignDetails?: Maybe<Scalars['String']['output']>;
  /**
   * Unique identifier for this campaign.
   * Auto-generated upon campaign creation.
   */
  campaignId: Scalars['ID']['output'];
  /** ISO 8601 timestamp of when this campaign was created. */
  createdAt: Scalars['String']['output'];
  /**
   * Number of contacts whose first response was classified as negative.
   * Important signal for message optimization.
   */
  firstResponseNegativeCount: Scalars['Int']['output'];
  /**
   * Number of contacts whose first response was classified as neutral.
   * Indicates lukewarm initial reception.
   */
  firstResponseNeutralCount: Scalars['Int']['output'];
  /**
   * Number of contacts whose first response was classified as positive.
   * Key metric for initial message effectiveness.
   */
  firstResponsePositiveCount: Scalars['Int']['output'];
  /**
   * The message template used for initial outreach.
   * May contain placeholders like {firstName} that are personalized per contact.
   */
  messageTemplate: Scalars['String']['output'];
  /**
   * Human-readable name for this campaign.
   * Used for identification in dashboards and reports.
   */
  name: Scalars['String']['output'];
  /**
   * Number of negative sentiment contacts handed off to human agents.
   * Often for customer service recovery or dispute resolution.
   */
  negativeHandoffCount: Scalars['Int']['output'];
  /**
   * Number of contacts whose overall sentiment is classified as negative.
   * Indicates disinterest, rejection, or negative emotion.
   */
  negativeResponseCount: Scalars['Int']['output'];
  /**
   * Percentage of responding contacts with negative sentiment.
   * Calculated as: (negativeResponseCount / responseCount) * 100
   */
  negativeResponseRate: Scalars['Float']['output'];
  /**
   * Number of neutral sentiment contacts handed off to human agents.
   * May indicate edge cases requiring human judgment.
   */
  neutralHandoffCount: Scalars['Int']['output'];
  /**
   * Number of contacts whose overall sentiment is classified as neutral.
   * Indicates acknowledgment without strong positive or negative emotion.
   */
  neutralResponseCount: Scalars['Int']['output'];
  /**
   * Percentage of responding contacts with neutral sentiment.
   * Calculated as: (neutralResponseCount / responseCount) * 100
   */
  neutralResponseRate: Scalars['Float']['output'];
  /**
   * Number of positive sentiment contacts handed off to human agents.
   * Tracks successful escalations for high-intent customers.
   */
  positiveHandoffCount: Scalars['Int']['output'];
  /**
   * Number of contacts whose overall sentiment is classified as positive.
   * Indicates interest, enthusiasm, or agreement with the outreach.
   */
  positiveResponseCount: Scalars['Int']['output'];
  /**
   * Percentage of responding contacts with positive sentiment.
   * Calculated as: (positiveResponseCount / responseCount) * 100
   */
  positiveResponseRate: Scalars['Float']['output'];
  /**
   * Total number of contacts who have replied to campaign messages.
   * A contact is counted once regardless of how many messages they send.
   */
  responseCount: Scalars['Int']['output'];
  /**
   * Number of messages successfully sent from this campaign.
   * Increments as messages are delivered to contacts.
   */
  sentCount: Scalars['Int']['output'];
  /**
   * Total number of contacts included in this campaign.
   * Set during campaign creation and remains constant.
   */
  totalContacts: Scalars['Int']['output'];
};

/**
 * Represents a single message in a conversation between the system and a customer.
 *
 * Messages are immutable once created and form a complete audit trail of all
 * communications. Each message includes metadata about its origin, timing, and
 * handling method.
 */
export type ChatMessage = {
  __typename?: 'ChatMessage';
  /**
   * The ID of the campaign this message is associated with.
   * Null for messages not related to a specific campaign (e.g., direct replies).
   */
  campaignId?: Maybe<Scalars['String']['output']>;
  /** Whether this message was sent to (outbound) or received from (inbound) the customer. */
  direction: MessageDirection;
  /**
   * Unique identifier for this message.
   * Auto-generated upon message creation.
   */
  id: Scalars['ID']['output'];
  /**
   * The actual text content of the message.
   * Stored exactly as sent/received with no modifications.
   */
  message: Scalars['String']['output'];
  /**
   * The phone number of the customer involved in this message.
   * In E.164 format (e.g., +12345678900).
   */
  phoneNumber: Scalars['String']['output'];
  /**
   * How this message was generated or handled.
   *
   * For outbound messages:
   * - automated: Sent by rule-based automation
   * - ai_agent: Generated by AI conversation agent
   * - manual: Sent by a human agent
   *
   * For inbound messages:
   * - Typically null or set based on how the response was triggered
   *
   * Null for messages without a specific response type classification.
   */
  responseType?: Maybe<ResponseType>;
  /**
   * ISO 8601 timestamp of when this message was sent or received.
   * Used for chronological ordering and conversation threading.
   */
  timestamp: Scalars['String']['output'];
};

/**
 * Input type for adding a contact to a campaign.
 * Each contact must have complete name and phone information.
 */
export type ContactInput = {
  /**
   * The contact's first name.
   * Used for message personalization (e.g., {firstName} placeholders).
   */
  firstName: Scalars['String']['input'];
  /**
   * The contact's last name.
   * Used for formal communications and record keeping.
   */
  lastName: Scalars['String']['input'];
  /**
   * The contact's phone number in E.164 format (e.g., +12345678900).
   * Must include country code with + prefix.
   */
  phoneNumber: Scalars['String']['input'];
};

/**
 * Input type for creating a new campaign.
 * Defines the campaign structure and initial message template.
 */
export type CreateCampaignInput = {
  /**
   * Optional additional context about this campaign.
   *
   * Can include:
   * - Campaign objectives and goals
   * - Target audience description
   * - Special instructions for agents
   * - Links to related resources
   */
  campaignDetails?: InputMaybe<Scalars['String']['input']>;
  /**
   * The message template for initial outreach.
   *
   * Supports personalization tokens:
   * - {firstName} - Contact's first name
   * - {lastName} - Contact's last name
   *
   * Example: "Hi {firstName}, we're reaching out to share..."
   */
  messageTemplate: Scalars['String']['input'];
  /**
   * Human-readable name for the campaign.
   * Should be descriptive and unique (e.g., "Q1 2024 Product Launch").
   */
  name: Scalars['String']['input'];
};

/**
 * Represents a contact in the outreach system.
 * Each customer is uniquely identified by their phone number and tracks
 * their interaction history across all campaigns.
 */
export type Customer = {
  __typename?: 'Customer';
  /**
   * Complete message history for this customer across all campaigns.
   * Includes both inbound and outbound messages in chronological order.
   */
  chatHistory: Array<ChatMessage>;
  /** ISO 8601 timestamp of when this customer record was first created in the system. */
  createdAt: Scalars['String']['output'];
  /** The customer's first name as provided during initial contact or campaign upload. */
  firstName: Scalars['String']['output'];
  /** The customer's last name as provided during initial contact or campaign upload. */
  lastName: Scalars['String']['output'];
  /**
   * The ID of the most recent campaign this customer was part of.
   * Null if the customer hasn't been included in any campaigns yet.
   */
  mostRecentCampaignId?: Maybe<Scalars['String']['output']>;
  /**
   * The customer's phone number in E.164 format (e.g., +12345678900).
   * This serves as the unique identifier for the customer.
   */
  phoneNumber: Scalars['String']['output'];
  /**
   * Current status of the customer in the outreach workflow.
   * Determines whether messages are automated, need review, or are handled by an agent.
   */
  status: CustomerStatus;
  /**
   * ISO 8601 timestamp of when this customer record was last updated.
   * Updates occur when status changes or new messages are exchanged.
   */
  updatedAt: Scalars['String']['output'];
};

/**
 * Represents the current state of a customer in the outreach workflow.
 * Determines how messages from this customer are handled.
 */
export type CustomerStatus =
  /**
   * A human agent is actively engaged in conversation with this customer.
   * Automated responses are disabled to prevent conflicts.
   */
  | 'agent_responding'
  /**
   * Customer is receiving automated responses from the AI agent.
   * No human intervention required at this stage.
   */
  | 'automated'
  /**
   * Customer has sent a message that requires human review or response.
   * This status triggers alerts for agents to take action.
   */
  | 'needs_response';

/** Indicates the direction of a message relative to the system. */
export type MessageDirection =
  /**
   * Message received from a customer to the system.
   * All inbound messages are processed for sentiment and routing.
   */
  | 'inbound'
  /**
   * Message sent from the system to a customer.
   * Includes automated messages, AI agent messages, and human agent messages.
   */
  | 'outbound';

/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Deletes all data from the system including customers, campaigns, and messages.
   *
   * **⚠️ DANGER: This operation is irreversible and destructive.**
   *
   * This mutation is intended for:
   * - Development and testing environments
   * - Demo resets between presentations
   * - Complete system cleanup during troubleshooting
   *
   * **NEVER use this in production unless you are absolutely certain.**
   *
   * Returns `true` if the operation completed successfully.
   *
   * **Example:**
   * ```graphql
   * mutation {
   *     clearAllData
   * }
   * ```
   *
   * **What gets deleted:**
   * - All customer records and their associated data
   * - All campaign records and metrics
   * - All chat messages and conversation history
   * - All related metadata and relationships
   *
   * **Recommended safeguards:**
   * - Require additional confirmation in the UI
   * - Implement environment-based restrictions
   * - Add audit logging for compliance
   * - Consider soft-delete patterns for production
   */
  clearAllData: Scalars['Boolean']['output'];
  /**
   * Creates a new outreach campaign.
   *
   * This initializes a new campaign with the provided name, message template,
   * and optional details. The campaign is created in a draft state with all
   * metrics initialized to zero. Use the sendCampaign mutation to actually
   * dispatch messages to contacts.
   *
   * **Example:**
   * ```graphql
   * mutation {
   *     createCampaign(input: {
   *         name: "Q1 Product Launch"
   *         messageTemplate: "Hi {firstName}, we're excited to announce..."
   *         campaignDetails: "Targeting existing customers for new feature launch"
   *     }) {
   *         campaignId
   *         name
   *         messageTemplate
   *         totalContacts
   *         createdAt
   *     }
   * }
   * ```
   *
   * **Workflow:** Create campaign → Add contacts → Send campaign
   */
  createCampaign: Campaign;
  /**
   * Sends messages to all contacts in the specified campaign.
   *
   * This mutation triggers the actual message delivery process. Messages are
   * sent asynchronously, and the campaign's sentCount will increment as
   * messages are successfully delivered.
   *
   * **Important considerations:**
   * - Messages are sent immediately; there is no undo
   * - Rate limiting is applied based on messaging provider limits
   * - Campaign metrics will begin updating as responses are received
   *
   * **Example:**
   * ```graphql
   * mutation {
   *     sendCampaign(campaignId: "camp_123456") {
   *         campaignId
   *         name
   *         totalContacts
   *         sentCount
   *     }
   * }
   * ```
   *
   * **Workflow:** Create campaign → Add contacts → **Send campaign** → Monitor responses
   */
  sendCampaign: Campaign;
  /**
   * Sends a manual message from a human agent to a customer.
   *
   * This mutation is used when an agent wants to send a custom message outside
   * of the automated flow. The message is marked with responseType: manual
   * and direction: outbound.
   *
   * **Key behaviors:**
   * - Message is sent immediately
   * - Customer's status may be automatically updated to agent_responding
   * - Message is added to the customer's chat history
   * - Automated responses are typically suspended while agent is active
   *
   * **Example:**
   * ```graphql
   * mutation {
   *     sendManualMessage(
   *         phoneNumber: "+12345678900"
   *         message: "Thanks for your interest! I'd love to schedule a call. Are you available tomorrow at 2pm?"
   *     ) {
   *         id
   *         phoneNumber
   *         message
   *         direction
   *         responseType
   *         timestamp
   *     }
   * }
   * ```
   *
   * **Use case:** Agent-initiated conversations, follow-ups, customer support
   *
   * **Important:** Ensure the agent has claimed this customer (status: agent_responding)
   * before sending manual messages to avoid conflicts with automated systems.
   */
  sendManualMessage: ChatMessage;
  /**
   * Updates an existing campaign's details.
   *
   * Currently supports updating the campaignDetails field only.
   * Cannot modify the campaign name or message template after creation
   * to maintain audit integrity.
   *
   * **Example:**
   * ```graphql
   * mutation {
   *     updateCampaign(input: {
   *         campaignId: "camp_123456"
   *         campaignDetails: "Updated targeting criteria: focus on high-value customers"
   *     }) {
   *         campaignId
   *         campaignDetails
   *         updatedAt
   *     }
   * }
   * ```
   *
   * **Note:** This mutation does not affect campaign metrics or sent messages.
   */
  updateCampaign: Campaign;
  /**
   * Updates the status of a customer in the outreach workflow.
   *
   * This mutation is typically called when:
   * - An agent takes over a conversation (status: agent_responding)
   * - An agent hands back a customer to automation (status: automated)
   * - A message requires review (status: needs_response)
   *
   * The mutation returns the updated Customer object with the new status
   * and updated timestamp.
   *
   * **Example:**
   * ```graphql
   * mutation {
   * updateCustomerStatus(
   * phoneNumber: "+12345678900"
   * status: agent_responding
   * ) {
   * phoneNumber
   * firstName
   * lastName
   * status
   * updatedAt
   * }
   * }
   * ```
   *
   * **Common workflows:**
   * - automated → needs_response (triggered by customer reply)
   * - needs_response → agent_responding (agent claims conversation)
   * - agent_responding → automated (agent releases conversation)
   */
  updateCustomerStatus: Customer;
};


/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type MutationCreateCampaignArgs = {
  input: CreateCampaignInput;
};


/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type MutationSendCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type MutationSendManualMessageArgs = {
  message: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};


/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type MutationUpdateCampaignArgs = {
  input: UpdateCampaignInput;
};


/**
 * Root mutation type for the Smart Outreach Hub GraphQL API.
 *
 * All mutations for modifying data are defined as extensions to this type
 * in domain-specific schema files. Mutations may trigger side effects such
 * as sending messages, updating customer status, or initializing campaigns.
 *
 * **Available mutation domains:**
 * - Customer mutations: Update customer status and data
 * - Campaign mutations: Create, update, and send campaigns
 * - Message mutations: Send manual messages
 * - Shared mutations: System-wide operations
 */
export type MutationUpdateCustomerStatusArgs = {
  phoneNumber: Scalars['String']['input'];
  status: CustomerStatus;
};

/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type Query = {
  __typename?: 'Query';
  /**
   * Retrieves all messages across all customers and campaigns.
   *
   * Returns messages in chronological order (most recent first). Use the
   * optional limit parameter to restrict the number of results for performance.
   *
   * **Warning:** Without a limit, this query can return very large result sets.
   * Consider using pagination in production environments.
   *
   * **Example:**
   * ```graphql
   * query {
   *     getAllMessages(limit: 100) {
   *         id
   *         phoneNumber
   *         message
   *         direction
   *         timestamp
   *         responseType
   *         campaignId
   *     }
   * }
   * ```
   *
   * **Use cases:**
   * - System-wide message monitoring
   * - Audit logs and compliance reporting
   * - Message volume analytics
   * - Debugging and troubleshooting
   */
  getAllMessages: Array<ChatMessage>;
  /**
   * Retrieves a single campaign by its unique identifier.
   *
   * Returns detailed campaign information including all performance metrics,
   * response counts, and sentiment analysis data. Returns null if no campaign
   * exists with the given ID.
   *
   * **Example:**
   * ```graphql
   * query {
   *     getCampaign(campaignId: "camp_123456") {
   *         campaignId
   *         name
   *         messageTemplate
   *         totalContacts
   *         sentCount
   *         responseCount
   *         positiveResponseRate
   *         neutralResponseRate
   *         negativeResponseRate
   *     }
   * }
   * ```
   *
   * **Use case:** Campaign detail pages, performance dashboards, reporting
   */
  getCampaign?: Maybe<Campaign>;
  /**
   * Retrieves the complete message history for a specific customer.
   *
   * Messages are returned in chronological order (oldest to newest) and
   * include both inbound and outbound communications across all campaigns.
   *
   * **Example:**
   * ```graphql
   * query {
   *     getChatHistory(phoneNumber: "+12345678900") {
   *         id
   *         message
   *         direction
   *         timestamp
   *         responseType
   *     }
   * }
   * ```
   */
  getChatHistory: Array<ChatMessage>;
  /**
   * Retrieves a single customer record by their phone number.
   *
   * Returns null if no customer exists with the given phone number.
   *
   * **Example:**
   * ```graphql
   * query {
   *     getCustomer(phoneNumber: "+12345678900") {
   *         phoneNumber
   *         firstName
   *         lastName
   *         status
   *         chatHistory {
   *             message
   *             timestamp
   *         }
   *     }
   * }
   * ```
   */
  getCustomer?: Maybe<Customer>;
  /**
   * Generates a pre-filled meeting invitation message for a customer.
   *
   * This message is customized based on the customer's interaction history
   * and current conversation context. Agents can use this as a template
   * when scheduling meetings with interested customers.
   *
   * Returns null if the customer doesn't exist or if meeting context
   * cannot be generated.
   *
   * **Use case:** Quick meeting scheduling, automated follow-ups
   */
  getPrefilledMeetingMessage?: Maybe<Scalars['String']['output']>;
  /**
   * Retrieves all customers in the system regardless of status.
   *
   * **Warning:** This query can return large result sets. Consider adding
   * pagination in future iterations for production use at scale.
   *
   * **Use case:** Admin dashboards, reporting, bulk operations
   */
  listAllCustomers: Array<Customer>;
  /**
   * Retrieves all campaigns in the system.
   *
   * Returns campaigns with complete performance metrics. Results are
   * typically sorted by creation date (most recent first).
   *
   * **Warning:** This query can return large result sets. Consider adding
   * pagination and filtering in future iterations for production use at scale.
   *
   * **Example:**
   * ```graphql
   * query {
   *     listCampaigns {
   *         campaignId
   *         name
   *         createdAt
   *         totalContacts
   *         sentCount
   *         responseCount
   *         positiveResponseRate
   *     }
   * }
   * ```
   *
   * **Use case:** Campaign overview dashboards, campaign selection dropdowns
   */
  listCampaigns: Array<Campaign>;
  /**
   * Retrieves all customers with status 'needs_response'.
   *
   * This query is used to populate agent dashboards showing customers
   * who require immediate attention or response. Results are typically
   * sorted by most recent message timestamp.
   *
   * **Use case:** Agent task queue, priority inbox
   */
  listCustomersNeedingResponse: Array<Customer>;
};


/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type QueryGetAllMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type QueryGetCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type QueryGetChatHistoryArgs = {
  phoneNumber: Scalars['String']['input'];
};


/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type QueryGetCustomerArgs = {
  phoneNumber: Scalars['String']['input'];
};


/**
 * Root query type for the Smart Outreach Hub GraphQL API.
 *
 * All queries for retrieving data are defined as extensions to this type
 * in domain-specific schema files. This modular approach keeps the schema
 * organized and maintainable.
 *
 * **Available query domains:**
 * - Customer queries: Get and list customer data
 * - Campaign queries: Retrieve campaign information and metrics
 * - Message queries: Access chat history and messages
 */
export type QueryGetPrefilledMeetingMessageArgs = {
  phoneNumber: Scalars['String']['input'];
};

/**
 * Classifies how a message response was generated or handled.
 *
 * This enum is used across the system to track the origin of outbound messages
 * and helps with analytics, auditing, and understanding customer interaction patterns.
 */
export type ResponseType =
  /**
   * Response generated by an AI conversation agent.
   *
   * The AI analyzes conversation context, customer intent, and business
   * rules to generate contextually appropriate responses.
   *
   * **Characteristics:**
   * - Contextual and personalized
   * - More flexible than automated rules
   * - Monitored for quality and appropriateness
   */
  | 'ai_agent'
  /**
   * Response generated by rule-based automation.
   *
   * These are pre-defined responses triggered by specific customer actions
   * or system events. No AI or human involvement in generation.
   *
   * **Examples:**
   * - Campaign messages sent to customers
   */
  | 'automated'
  /**
   * Response manually written and sent by a human agent.
   *
   * Used when personal attention is required or when handling complex
   * customer inquiries that need human judgment and empathy.
   *
   * **Use cases:**
   * - High-value customer conversations
   * - Complex questions requiring expertise
   * - Escalated issues or complaints
   */
  | 'manual';

/**
 * Input type for updating an existing campaign.
 * Currently only supports updating campaign details.
 */
export type UpdateCampaignInput = {
  /**
   * Updated campaign details and context.
   * Replaces the existing campaignDetails value.
   */
  campaignDetails?: InputMaybe<Scalars['String']['input']>;
  /** The unique identifier of the campaign to update. */
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

