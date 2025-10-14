"""Main module for processing customer messages and generating agent responses."""

from typing import Optional, Union

import constants
from dynamodb.chat_history import ChatHistoryDDB
from dynamodb.customer import CustomerDDB
from dynamodb.models import CustomerStatus, UpdateChatMessageAttributes
from guardrails import apply_guardrails
from logging_config import setup_logging
from phone_utils import mask_phone_number, normalize_phone_number, validate_phone_number
from pydantic_ai.usage import RunUsage, UsageLimits
from pydantic_core import ValidationError
from retrier import exponential_backoff_retry

from agent.agent import sales_agent
from agent.models import AgentContext, AgentResponseWrapper
from agent.utils import convert_history_to_messages

logger = setup_logging(__name__)

usage_limits = UsageLimits(request_limit=50)


async def process_message(
    phone_number: str, incoming_message: str, incoming_message_id: Optional[str] = None
) -> Union[AgentResponseWrapper, None]:
    """
    Main entry point for processing a new message.

    Args:
        phone_number: The customer's phone number
        incoming_message: The message received from the customer
        incoming_message_id: The ID of the incoming message

    Returns:
        The AI-generated response message
    """
    campaign_id = None
    try:
        # Validate phone number format
        if not validate_phone_number(phone_number):
            raise ValueError(f"Invalid phone number format: {mask_phone_number(phone_number)}")

        # Normalize phone number for consistent processing
        normalized_phone = normalize_phone_number(phone_number)

        customer = CustomerDDB.get_or_create_customer(phone_number=normalized_phone)

        # Check customer status - only respond with AI if status is 'automated'
        if customer.status != CustomerStatus.AUTOMATED:
            logger.info(
                f"Customer {mask_phone_number(normalized_phone)} status is {customer.status}, not responding with AI"
            )
            return None

        # Check if customer has a campaign ID - required for AI processing
        campaign_id = customer.most_recent_campaign_id
        if not campaign_id:
            logger.info(
                f"Customer {mask_phone_number(normalized_phone)} has no campaign ID, skipping AI processing"
            )
            return None

        is_valid, guardrails_response = apply_guardrails(incoming_message)
        if not is_valid:
            ChatHistoryDDB.update_message_attributes(
                incoming_message_id,
                attributes=UpdateChatMessageAttributes(
                    guardrails_intervened=True, user_sentiment="negative"
                ),
            )
            return AgentResponseWrapper(
                response_text=guardrails_response,
                should_handoff=False,
                guardrails_intervened=True,
                campaign_id=campaign_id,
            )

        # Get campaign-scoped conversation history (exclude current message) and convert to Pydantic AI message format
        conversation_history = ChatHistoryDDB.get_conversation_history(
            normalized_phone, campaign_id, skip_last=True
        )
        message_history = convert_history_to_messages(conversation_history)

        # Create context for the agent
        context = AgentContext(
            customer_phone_number=normalized_phone,
            customer_name=f"{customer.first_name} {customer.last_name}",
            most_recent_campaign_id=campaign_id,
        )

        # Generate response using the AI agent
        usage = RunUsage()

        async def run_agent():
            return await sales_agent.run(
                incoming_message,
                deps=context,
                message_history=message_history,
                usage=usage,
                usage_limits=usage_limits,
            )

        result = await exponential_backoff_retry(run_agent)
        agent_response = result.output

        # Check if human handoff is required
        if agent_response.should_handoff:
            CustomerDDB.update_customer_status(
                normalized_phone, CustomerStatus.NEEDS_RESPONSE
            )
            logger.info(
                f"Human handoff triggered for {mask_phone_number(normalized_phone)}"
            )

        if agent_response.user_sentiment:
            ChatHistoryDDB.update_message_attributes(
                incoming_message_id,
                attributes=UpdateChatMessageAttributes(
                    user_sentiment=agent_response.user_sentiment
                ),
            )

        return AgentResponseWrapper(
            **agent_response.model_dump(),
            campaign_id=campaign_id,
            request_tokens=usage.input_tokens,
            response_tokens=usage.output_tokens,
        )

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        return AgentResponseWrapper(
            response_text=constants.TECHNICAL_DIFFICULTY_RESPONSE,
            should_handoff=False,
            campaign_id=campaign_id,
        )

    except Exception as e:
        is_throttling = (
            "ThrottlingException" in str(e)
            or "Too many requests" in str(e)
            or "reached max retries" in str(e)
        )

        if is_throttling:
            error_msg = f"API throttling error after retries: {str(e)}"
            logger.error(error_msg, exc_info=True)
            agent_response = AgentResponseWrapper(
                response_text=constants.HIGH_DEMAND_RESPONSE,
                should_handoff=False,
                campaign_id=campaign_id,
            )
        else:
            error_msg = f"Error processing message: {str(e)}"
            logger.error(error_msg, exc_info=True)
            agent_response = AgentResponseWrapper(
                response_text=constants.TECHNICAL_DIFFICULTY_RESPONSE,
                should_handoff=False,
                campaign_id=campaign_id,
            )

        return agent_response
