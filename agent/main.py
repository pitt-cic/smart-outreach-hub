"""Main module for processing customer messages and generating agent responses."""

from typing import Optional, Union

from pydantic_ai.usage import RunUsage, UsageLimits
from pydantic_core import ValidationError

from agent.agent import sales_agent
from agent.models import AgentResponseWrapper, AgentContext
from agent.utils import convert_history_to_messages
from database import (
    get_conversation_history,
    get_or_create_customer,
    update_customer_status,
    update_message_attributes,
)
from guardrails import apply_guardrails
from phone_utils import validate_phone_number, normalize_phone_number
from pydantic_logging import logfire
from retrier import exponential_backoff_retry

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
            error_msg = f"Invalid phone number format: {phone_number}"
            print(f"ERROR: {error_msg}")
            logfire.error("Invalid phone number", phone_number=phone_number)
            raise ValueError(error_msg)

        # Normalize phone number for consistent processing
        normalized_phone = normalize_phone_number(phone_number)

        customer = get_or_create_customer(normalized_phone)

        # Check customer status - only respond with AI if status is 'automated'
        if customer["status"] != "automated":
            logfire.info(
                f"Customer status is {customer['status']}, not responding with AI"
            )
            return None

        # Check if customer has a campaign ID - required for AI processing
        campaign_id = customer.get("most_recent_campaign_id")
        if not campaign_id:
            logfire.info(
                "Customer has no campaign ID, skipping AI processing",
                phone_number=normalized_phone,
            )
            return None

        is_valid, guardrails_response = apply_guardrails(incoming_message)
        if not is_valid:
            update_message_attributes(
                incoming_message_id,
                attributes={
                    "guardrails_intervened": True,
                    "user_sentiment": "negative",
                },
            )
            return AgentResponseWrapper(
                response_text=guardrails_response,
                should_handoff=False,
                guardrails_intervened=True,
                campaign_id=campaign_id,
            )

        # Get campaign-scoped conversation history (exclude current message) and convert to Pydantic AI message format
        conversation_history = get_conversation_history(normalized_phone, campaign_id)[
            :-1
        ]
        message_history = convert_history_to_messages(conversation_history)

        # Create context for the agent
        context = AgentContext(
            customer_phone_number=normalized_phone,
            customer_name=f"{customer['first_name']} {customer['last_name']}",
            most_recent_campaign_id=customer.get("most_recent_campaign_id"),
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

        print("Running agent")
        result = await exponential_backoff_retry(run_agent)
        agent_response = result.output

        # Check if human handoff is required
        if agent_response.should_handoff:
            update_customer_status(normalized_phone, "needs_response")
            print("\n=== HUMAN HANDOFF TRIGGERED ===")
            print(f"To: {normalized_phone}")
            print(f"Customer: {customer['first_name']} {customer['last_name']}")
            print(f"Reason: {agent_response.handoff_reason}")
            print("================================\n")

        if agent_response.user_sentiment:
            update_message_attributes(
                incoming_message_id,
                attributes={"user_sentiment": agent_response.user_sentiment},
            )

        return AgentResponseWrapper(
            **agent_response.model_dump(),
            campaign_id=campaign_id,
            request_tokens=usage.input_tokens,
            response_tokens=usage.output_tokens,
        )

    except ValidationError as e:
        print(f"ValidationError: {e}")
        print(f"ValidationError: {e.error_count()}")
        print(f"ValidationError: {e.errors()}")
        return AgentResponseWrapper(
            response_text="I'm experiencing high demand right now. Please try again in a few moments. Thanks for your patience! H2P! 🐾",
            should_handoff=False,
            campaign_id=campaign_id,
        )

    except Exception as e:
        # Enhanced error handling for better debugging
        if hasattr(e, "message"):
            print(f"Message: {e.message}")
        if hasattr(e, "body"):
            print(f"Body: {e.body}")
        error_type = type(e).__name__
        is_throttling = (
            "ThrottlingException" in str(e)
            or "Too many requests" in str(e)
            or "reached max retries" in str(e)
        )

        if is_throttling:
            error_msg = f"API throttling error after retries: {str(e)}"
            print(f"THROTTLING ERROR: {error_msg}")
            logfire.error(
                "API throttling error",
                error=str(e),
                error_type=error_type,
                phone_number=phone_number,
                is_throttling=True,
            )
            agent_response = AgentResponseWrapper(
                response_text="I'm experiencing high demand right now. Please try again in a few moments. Thanks for your patience! H2P! 🐾",
                should_handoff=False,
                campaign_id=campaign_id,
            )
        else:
            error_msg = f"Error processing message: {str(e)}"
            print(f"ERROR: {error_msg}")
            logfire.error(
                "Message processing failed",
                error=str(e),
                error_type=error_type,
                phone_number=phone_number,
                is_throttling=False,
            )
            agent_response = AgentResponseWrapper(
                response_text="I apologize, but I'm experiencing technical difficulties. Please try again later.",
                should_handoff=False,
                campaign_id=campaign_id,
            )

        return agent_response
