"""AWS Lambda handler for processing incoming messages and webhooks."""

import asyncio
import json
from typing import Any, Dict

from constants import TECHNICAL_DIFFICULTY_RESPONSE
from logging_config import setup_logging
from main import process_message
from sqs_utils import send_to_outbound_sms_queue

from agent.models import AgentResponseWrapper

logger = setup_logging(__name__)


def lambda_handler(event: Dict[str, Any], _: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for the sales AI Agent

    Handles direct invocations

    Args:
        event: The event dictionary containing phone_number, message, and message_id
        _: The context object (not used)
    
    Returns:
        The response dictionary with status code and body
    """

    try:
        logger.info(f"Lambda invocation - Event: {json.dumps(event, default=str)}")

        for key in ["phone_number", "message", "message_id"]:
            if key not in event:
                raise ValueError(f"Missing required field: {key}")
        
        return process_message_sync(
            phone_number=event["phone_number"],
            message=event["message"],
            message_id=event["message_id"],
        )

    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error", "message": str(e)}),
        }


def process_message_sync(phone_number: str, message: str, message_id: str) -> Dict[str, Any]:
    """
    Synchronous wrapper for the async process_message function

    Args:
        phone_number: The customer's phone number
        message: The message received from the customer
        message_id: The ID of the incoming message
    
    Returns:
        The response dictionary with status code and body
    """

    try:
        logger.info(f"Processing message from {phone_number}: {message}")

        # Run the async function in the event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            response = loop.run_until_complete(
                process_message(phone_number, message, message_id)
            )

            logger.info(f"AI response generated: {response}")

            queue_success, queue_timestamp = send_to_outbound_sms_queue(phone_number, response)

            return {
                "statusCode": 200,
                "body": json.dumps(
                    {
                        "phone_number": phone_number,
                        "incoming_message": message,
                        "ai_response": response.as_dict() if response else None,
                        "sms_queued": queue_success,
                        "timestamp": queue_timestamp,
                    }
                ),
            }

        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Message processing error: {str(e)}", exc_info=True)

        agent_response = AgentResponseWrapper(
            response_text=TECHNICAL_DIFFICULTY_RESPONSE,
            should_handoff=True,
            handoff_reason="System error",
        )
        
        queue_success, queue_timestamp = send_to_outbound_sms_queue(phone_number, agent_response)
        
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "error": f"Message processing failed: {str(e)}",
                    "phone_number": phone_number,
                    "incoming_message": message,
                    "ai_response": agent_response.as_dict(),
                    "sms_queued": queue_success,
                    "timestamp": queue_timestamp,
                }
            ),
        }
