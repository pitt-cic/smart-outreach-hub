import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from database import get_or_create_customer
from logging_config import setup_logging
from phone_utils import normalize_phone_number, validate_phone_number
from utils import get_boto3_session_config, get_dynamodb_resource_config

logger = setup_logging(__name__)

# Table names from environment variables
CUSTOMER_TABLE_NAME = os.environ.get("DYNAMODB_CUSTOMER_TABLE", "outreach-customers")
CAMPAIGN_TABLE_NAME = os.environ.get("DYNAMODB_CAMPAIGN_TABLE", "outreach-campaigns")
CHAT_TABLE_NAME = os.environ.get("DYNAMODB_CHAT_TABLE", "outreach-chat-history")

# Initialize DynamoDB resource and table references
session = boto3.Session(**get_boto3_session_config())
dynamodb = session.resource("dynamodb", **get_dynamodb_resource_config())
TABLES = {
    "customers": dynamodb.Table(CUSTOMER_TABLE_NAME),
    "campaigns": dynamodb.Table(CAMPAIGN_TABLE_NAME),
    "chat_history": dynamodb.Table(CHAT_TABLE_NAME),
}


def initialize_database():
    """Initialize DynamoDB tables. Creates tables if they don't exist."""
    try:
        dynamodb.Table(CUSTOMER_TABLE_NAME).load()
        logger.info(f"Connected to DynamoDB table: {CUSTOMER_TABLE_NAME}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info(f"{CUSTOMER_TABLE_NAME} table not found, creating it ...")
            dynamodb.create_table(
                AttributeDefinitions=[
                    {"AttributeName": "phone_number", "AttributeType": "S"}
                ],
                TableName=CUSTOMER_TABLE_NAME,
                KeySchema=[{"AttributeName": "phone_number", "KeyType": "HASH"}],
                BillingMode="PAY_PER_REQUEST",
            )
        else:
            raise e

    try:
        dynamodb.Table(CHAT_TABLE_NAME).load()
        logger.info(f"Connected to DynamoDB table: {CHAT_TABLE_NAME}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info(f"{CHAT_TABLE_NAME} table not found, creating it ...")
            dynamodb.create_table(
                AttributeDefinitions=[
                    {"AttributeName": "id", "AttributeType": "S"},
                    {"AttributeName": "phone_number", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                ],
                TableName=CHAT_TABLE_NAME,
                KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "phone_number-timestamp-index",
                        "KeySchema": [
                            {"AttributeName": "phone_number", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    },
                ],
                BillingMode="PAY_PER_REQUEST",
            )
        else:
            raise e

    try:
        dynamodb.Table(CAMPAIGN_TABLE_NAME).load()
        logger.info(f"Connected to DynamoDB table: {CAMPAIGN_TABLE_NAME}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info(f"{CAMPAIGN_TABLE_NAME} table not found, creating it ...")
            dynamodb.create_table(
                AttributeDefinitions=[
                    {"AttributeName": "campaign_id", "AttributeType": "S"}
                ],
                TableName=CAMPAIGN_TABLE_NAME,
                KeySchema=[{"AttributeName": "campaign_id", "KeyType": "HASH"}],
                BillingMode="PAY_PER_REQUEST",
            )
        else:
            raise e


def create_customer(
    phone_number: str,
    first_name: str = "Test",
    last_name: str = "Customer",
    most_recent_campaign_id: Optional[str] = None,
    status: Optional[str] = "automated",
):
    """Create a customer record in the customers table."""
    try:
        global TABLES
        customer_table = TABLES["customers"]
        item = {
            "phone_number": phone_number,
            "first_name": first_name,
            "last_name": last_name,
            "most_recent_campaign_id": most_recent_campaign_id,
            "status": status,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        customer_table.put_item(Item=item)
    except ClientError as e:
        logger.error(f"Error creating customer: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating customer: {e}")
        raise


def add_message_to_history(
    phone_number: str,
    message: str,
    direction: str,
    campaign_id: Optional[str] = None,
    response_type: Optional[str] = None,
    guardrails_intervened: Optional[dict[str, Any]] = None,
) -> str:
    """Add a message to the chat history and return the message ID."""
    # Validate and normalize phone number
    if not validate_phone_number(phone_number):
        raise ValueError(f"Invalid phone number format: {phone_number}")

    normalized_phone = normalize_phone_number(phone_number)
    message_id = str(uuid.uuid4())
    timestamp = datetime.now(tz=timezone.utc).isoformat()

    try:
        global TABLES
        chat_table = TABLES["chat_history"]

        # Prepare item for DynamoDB
        item = {
            "id": message_id,
            "phone_number": normalized_phone,
            "message": message,
            "direction": direction,
            "timestamp": timestamp,
        }

        # Add optional fields if provided
        if campaign_id:
            item["campaign_id"] = campaign_id
        if response_type:
            item["response_type"] = response_type
        if guardrails_intervened:
            item["guardrails_intervened"] = guardrails_intervened

        # Put item in DynamoDB
        chat_table.put_item(Item=item)

        logger.debug(f"Added message {message_id} to history for {normalized_phone}")
        return message_id

    except ClientError as e:
        logger.error(f"Error adding message to history: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error adding message to history: {e}")
        raise


def create_test_campaign(
    campaign_id: str,
    name: str,
    message_template: str,
    campaign_details: str | None = None,
):
    """Create a campaign record in the campaigns table."""
    global TABLES
    campaign_table = TABLES["campaigns"]

    item = {
        "campaign_id": campaign_id,
        "name": name,
        "message_template": message_template,
    }

    if campaign_details:
        item["campaign_details"] = campaign_details

    campaign_table.put_item(Item=item)


def add_campaign_message(
    phone_number: str,
    campaign_name: str,
    campaign_message: str,
    campaign_id: str = None,
    campaign_details: str | None = None,
):
    """Add a campaign message to the database with proper foreign key setup."""
    if campaign_id is None:
        campaign_id = str(uuid.uuid4())

    normalized_phone = normalize_phone_number(phone_number)

    # Create campaign record first (required for foreign key)
    create_test_campaign(
        campaign_id=campaign_id,
        name=campaign_name,
        message_template=campaign_message,
        campaign_details=campaign_details,
    )

    # Ensure customer exists
    get_or_create_customer(normalized_phone, first_name="Test", last_name="Customer")

    # Add campaign message as outbound message
    add_message_to_history(
        phone_number=normalized_phone,
        message=campaign_message,
        direction="outbound",
        campaign_id=campaign_id,
        response_type="automated",
    )

    return campaign_id


def cleanup_test_data(phone_number: str):
    """Clean up test data for a specific phone number."""
    global TABLES

    customer_table = TABLES["customers"]
    chat_table = TABLES["chat_history"]
    campaign_table = TABLES["campaigns"]

    normalized_phone = normalize_phone_number(phone_number)

    # Get all chat history for this phone number
    chat_history = chat_table.query(
        IndexName="phone_number-timestamp-index",
        KeyConditionExpression=Key("phone_number").eq(normalized_phone),
    )

    chat_ids = {item["id"] for item in chat_history.get("Items", [])}
    campaign_ids = set()
    for item in chat_history.get("Items", []):
        if item.get("campaign_id"):
            campaign_ids.add(item["campaign_id"])

    # Delete chat history for this phone number using batch write
    with chat_table.batch_writer() as batch:
        for chat_id in chat_ids:
            batch.delete_item(Key={"id": chat_id})

    with campaign_table.batch_writer() as batch:
        for campaign_id in campaign_ids:
            batch.delete_item(Key={"campaign_id": campaign_id})

    # Delete customer record using delete_item
    customer_table.delete_item(Key={"phone_number": normalized_phone})
