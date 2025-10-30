"""SQS utility functions for message processing."""

import json
import os
from datetime import datetime, timezone

import boto3
from custom_types import OutboundSQSMessageAttributes, OutboundSQSMessageBody
from logging_config import setup_logging
from utils import get_boto3_session_config

from agent.models import AgentResponseWrapper

logger = setup_logging(__name__)

OUTBOUND_SMS_QUEUE_URL = os.environ.get("OUTBOUND_SMS_QUEUE_URL")

# Initialize SQS client
sqs = boto3.client("sqs", **get_boto3_session_config())

def send_to_outbound_sms_queue(
    phone_number: str, agent_response: AgentResponseWrapper | None = None
) -> tuple[bool, str]:
    """
    Send agent response to outbound SMS queue for processing

    Args:
        phone_number: The recipient phone number
        message_id: The ID of the incoming message
        agent_response: The complete AgentResponseWrapper object from the AI agent

    Returns:
        Tuple indicating success status and the timestamp when the message queue was attempted
    """
    queue_timestamp = datetime.now(tz=timezone.utc).isoformat()
    if not OUTBOUND_SMS_QUEUE_URL:
        logger.error("OUTBOUND_SMS_QUEUE_URL environment variable not set")
        return False, queue_timestamp

    if not agent_response:
        logger.error("Agent response is None, not sending to outbound SMS queue")
        return False, queue_timestamp

    try:
        message_body = OutboundSQSMessageBody(
            phoneNumber=phone_number,
            agentResponse=agent_response.as_dict(),
            campaignId=agent_response.campaign_id,
            timestamp=queue_timestamp,
        )

        message_attributes = OutboundSQSMessageAttributes()

        # Add campaign_id to message attributes if provided
        if agent_response.campaign_id:
            message_attributes.campaignId = agent_response.campaign_id

        response = sqs.send_message(
            QueueUrl=OUTBOUND_SMS_QUEUE_URL,
            MessageBody=json.dumps(message_body.as_dict()),
            MessageAttributes=message_attributes.to_sqs_format(),
        )

        logger.info(f"Message queued successfully. MessageId: {response['MessageId']}")
        return True, queue_timestamp

    except Exception as e:
        logger.error(f"Failed to send message to SQS queue: {str(e)}", exc_info=True)
        return False, queue_timestamp
