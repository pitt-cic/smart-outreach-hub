import asyncio
import json
import os
import time
from typing import Any, Dict, Optional

import boto3

from agent.models import AgentResponseWrapper
from logging_config import setup_logging
from main import process_message

logger = setup_logging(__name__)

# Initialize SQS client
sqs = boto3.client("sqs")
OUTBOUND_SMS_QUEUE_URL = os.environ.get("OUTBOUND_SMS_QUEUE_URL")


def send_to_outbound_sms_queue(
    phone_number: str, agent_response: Optional[AgentResponseWrapper]
) -> bool:
    """
    Send AgentResponseWrapper to outbound SMS queue for processing

    Args:
        phone_number: The recipient phone number
        message_id: The ID of the incoming message
        agent_response: The complete AgentResponseWrapper object from the AI agent

    Returns:
        bool: True if message was successfully queued, False otherwise
    """
    if not OUTBOUND_SMS_QUEUE_URL:
        logger.error("OUTBOUND_SMS_QUEUE_URL environment variable not set")
        return False

    if not agent_response:
        logger.error("Agent response is None, not sending to outbound SMS queue")
        return False

    try:
        message_body = {
            "phone_number": phone_number,
            "agent_response": agent_response.as_dict(),
            "campaign_id": agent_response.campaign_id,
            "timestamp": time.time(),
        }

        message_attributes = {
            "phone_number": {"StringValue": phone_number, "DataType": "String"},
            "message_type": {"StringValue": "agent_response", "DataType": "String"},
        }

        # Add campaign_id to message attributes if provided
        if agent_response.campaign_id:
            message_attributes["campaign_id"] = {
                "StringValue": agent_response.campaign_id,
                "DataType": "String",
            }

        response = sqs.send_message(
            QueueUrl=OUTBOUND_SMS_QUEUE_URL,
            MessageBody=json.dumps(message_body),
            MessageAttributes=message_attributes,
        )

        logger.info(f"Message queued successfully. MessageId: {response['MessageId']}")
        return True

    except Exception as e:
        logger.error(f"Failed to send message to SQS queue: {str(e)}", exc_info=True)
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler for the sales AI Agent

    Handles both API Gateway events and direct invocations
    """

    try:
        logger.info(f"Lambda invocation - Event: {json.dumps(event, default=str)}")

        # Handle direct Lambda invocations
        if "phone_number" in event and "message" in event:
            return handle_direct_invocation(event, context)

        # Handle health check
        elif event.get("path") == "/agent/health":
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Amz-Date, Authorization, X-Api-Key",
                },
                "body": json.dumps(
                    {
                        "status": "healthy",
                        "service": "Sales AI Agent",
                        "timestamp": context.aws_request_id if context else "local",
                    }
                ),
            }

        else:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(
                    {
                        "error": "Invalid event format. Expected httpMethod or phone_number/message fields."
                    }
                ),
            }

    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": "Internal server error", "message": str(e)}),
        }


def handle_direct_invocation(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle direct Lambda invocations"""

    phone_number = event["phone_number"]
    message = event["message"]
    message_id = event["message_id"]

    return process_message_sync(phone_number, message, message_id, context)


def process_message_sync(
    phone_number: str, message: str, message_id: str, context: Any
) -> Dict[str, Any]:
    """
    Synchronous wrapper for the async process_message function
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

            # Send the entire AgentResponseWrapper to the outbound SMS queue
            queue_success = send_to_outbound_sms_queue(phone_number, response)

            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(
                    {
                        "phone_number": phone_number,
                        "incoming_message": message,
                        "ai_response": response.as_dict() if response else None,
                        "sms_queued": queue_success,
                        "timestamp": context.aws_request_id if context else "local",
                    }
                ),
            }

        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Message processing error: {str(e)}", exc_info=True)

        # Check if it's a throttling error for better user feedback
        if "ThrottlingException" in str(e) or "Too many requests" in str(e):
            error_message = "I'm experiencing high demand right now. Please try again in a few moments. Thanks for your patience! H2P! 🐾"
        else:
            error_message = "I apologize, but I'm experiencing technical difficulties. Please try again later."

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "error": "Message processing failed",
                    "ai_response": error_message,
                    "phone_number": phone_number,
                    "incoming_message": message,
                    "details": str(e),
                }
            ),
        }
