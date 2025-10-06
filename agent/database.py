import os
import sys
from datetime import datetime
from typing import Any, List, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError, EndpointConnectionError

from logging_config import setup_logging
from phone_utils import normalize_phone_number, validate_phone_number
from utils import get_boto3_session_config, get_dynamodb_resource_config

# Configure logging
logger = setup_logging(__name__)

# Initialize DynamoDB resource
session = boto3.Session(**get_boto3_session_config())
dynamodb = session.resource("dynamodb", **get_dynamodb_resource_config())

# Table names from environment variables
CUSTOMER_TABLE_NAME = os.environ.get("DYNAMODB_CUSTOMER_TABLE", "outreach-customers")
CAMPAIGN_TABLE_NAME = os.environ.get("DYNAMODB_CAMPAIGN_TABLE", "outreach-campaigns")
CHAT_TABLE_NAME = os.environ.get("DYNAMODB_CHAT_TABLE", "outreach-chat-history")


def get_table_references():
    """Get DynamoDB table references."""
    return {
        "customers": dynamodb.Table(CUSTOMER_TABLE_NAME),
        "campaigns": dynamodb.Table(CAMPAIGN_TABLE_NAME),
        "chat_history": dynamodb.Table(CHAT_TABLE_NAME),
    }


def initialize_database():
    """Initialize database connection. DynamoDB tables are created by CDK."""
    try:
        tables = get_table_references()

        # Test connection by checking if tables exist
        for table in tables.values():
            table.load()
            logger.info(f"Connected to DynamoDB table: {table.table_name}")

        logger.info("DynamoDB connection initialized successfully")
        return True

    except EndpointConnectionError as e:
        logger.error(f"Failed to initialize DynamoDB connection: {e}")
        sys.exit(1)

    except Exception as e:
        logger.error(f"Failed to initialize DynamoDB connection: {e}")
        return False


def get_conversation_history(phone_number: str, campaign_id: str) -> List[Dict]:
    """Get chat messages for a phone number and specific campaign in chronological order."""
    # Normalize phone number for database lookup
    if not validate_phone_number(phone_number):
        logger.warning(f"Invalid phone number format: {phone_number}")
        return []

    if not campaign_id:
        logger.warning(f"Campaign ID is required for conversation history")
        return []

    normalized_phone = normalize_phone_number(phone_number)

    try:
        tables = get_table_references()
        chat_table = tables["chat_history"]

        # Query using the GSI phone_number-timestamp-index and filter by campaign_id
        response = chat_table.query(
            IndexName="phone_number-timestamp-index",
            KeyConditionExpression=Key("phone_number").eq(normalized_phone),
            FilterExpression=Attr("campaign_id").eq(campaign_id),
            ScanIndexForward=True,  # Sort by timestamp ascending
        )

        messages = response.get("Items", [])
        logger.info(
            f"Retrieved {len(messages)} messages for {normalized_phone} in campaign {campaign_id}"
        )
        return messages

    except ClientError as e:
        logger.error(
            f"Error retrieving conversation history for {normalized_phone} in campaign {campaign_id}: {e}"
        )
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving conversation history: {e}")
        return []


def get_or_create_customer(
    phone_number: str, first_name: str = "Unknown", last_name: str = "Customer"
) -> Dict:
    """Get existing customer or create a new one."""
    # Validate and normalize phone number
    if not validate_phone_number(phone_number):
        raise ValueError(f"Invalid phone number format: {phone_number}")

    normalized_phone = normalize_phone_number(phone_number)

    try:
        tables = get_table_references()
        customer_table = tables["customers"]

        # Try to get existing customer
        response = customer_table.get_item(Key={"phone_number": normalized_phone})

        if "Item" in response:
            logger.info(f"Found existing customer: {normalized_phone}")
            return response["Item"]

        # Create new customer
        timestamp = datetime.utcnow().isoformat()
        new_customer = {
            "phone_number": normalized_phone,
            "first_name": first_name,
            "last_name": last_name,
            "status": "automated",
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        customer_table.put_item(Item=new_customer)

        logger.info(f"Created new customer: {normalized_phone}")
        return new_customer

    except ClientError as e:
        logger.error(f"Error getting or creating customer {normalized_phone}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting or creating customer: {e}")
        raise


def update_customer_status(phone_number: str, status: str):
    """Update customer status."""
    # Validate and normalize phone number
    if not validate_phone_number(phone_number):
        raise ValueError(f"Invalid phone number format: {phone_number}")

    normalized_phone = normalize_phone_number(phone_number)

    try:
        tables = get_table_references()
        customer_table = tables["customers"]

        # Update customer status and timestamp
        response = customer_table.update_item(
            Key={"phone_number": normalized_phone},
            UpdateExpression="SET #status = :status, updated_at = :updated_at",
            ExpressionAttributeNames={
                "#status": "status"  # 'status' is a reserved keyword in DynamoDB
            },
            ExpressionAttributeValues={
                ":status": status,
                ":updated_at": datetime.utcnow().isoformat(),
            },
            ReturnValues="UPDATED_NEW",
        )

        logger.info(f"Updated customer status for {normalized_phone} to {status}")

    except ClientError as e:
        logger.error(f"Error updating customer status for {normalized_phone}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating customer status: {e}")
        raise


def update_message_attributes(message_id: str, attributes: Dict[str, Any]):
    """Update the attributes for a message."""
    try:
        tables = get_table_references()
        chat_table = tables["chat_history"]

        # Build the update expression and attribute mappings dynamically
        update_expressions = []
        expression_attribute_names = {}
        expression_attribute_values = {}

        for attr_name, attr_value in attributes.items():
            # Use attribute names to handle reserved keywords
            placeholder_name = f"#{attr_name}"
            placeholder_value = f":{attr_name}"

            update_expressions.append(f"{placeholder_name} = {placeholder_value}")
            expression_attribute_names[placeholder_name] = attr_name
            expression_attribute_values[placeholder_value] = attr_value

        update_expression = f"SET {', '.join(update_expressions)}"

        chat_table.update_item(
            Key={"id": message_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
        )
        logger.info(f"Updated attributes for message {message_id}: {attributes}")
        return True
    except ClientError as e:
        logger.error(f"Error updating attributes for message {message_id}: {e}")
        return False
    except Exception as e:
        logger.error(
            f"Unexpected error updating attributes for message {message_id}: {e}"
        )
        return False


def get_last_outbound_message_info(phone_number: str) -> Optional[str]:
    """
    Get the additional_info from the last automated outbound message for a phone number.

    Args:
        phone_number: The customer's phone number

    Returns:
        The additional_info JSON string from the last automated outbound message,
        or None if no such message exists
    """
    # Validate and normalize phone number
    if not validate_phone_number(phone_number):
        print(f"Warning: Invalid phone number format: {phone_number}")
        return None

    normalized_phone = normalize_phone_number(phone_number)

    tables = get_table_references()
    chat_table = tables["chat_history"]

    response = chat_table.query(
        IndexName="phone_number-timestamp-index",
        KeyConditionExpression=Key("phone_number").eq(normalized_phone),
        ScanIndexForward=False,
        FilterExpression=Attr("direction").eq("outbound")
        & Attr("response_type").eq("ai_agent"),
        Limit=1,
    )

    result = response.get("Items", [])

    return result[0]["additional_info"] if result else {}


def get_campaign_by_id(campaign_id: str) -> Dict:
    """Get a campaign by its ID."""
    tables = get_table_references()
    campaign_table = tables["campaigns"]
    response = campaign_table.get_item(Key={"campaign_id": campaign_id})
    return response.get("Item", None)


# Initialize database on import
initialize_database()
