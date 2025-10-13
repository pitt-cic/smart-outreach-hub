import os
from typing import Any

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError
from logging_config import setup_logging
from utils import get_boto3_session_config, get_dynamodb_resource_config

logger = setup_logging(__name__)

# Initialize DynamoDB resource
session = boto3.Session(**get_boto3_session_config())
dynamodb = session.resource("dynamodb", **get_dynamodb_resource_config())

CUSTOMER_TABLE_NAME = os.environ.get("DYNAMODB_CUSTOMER_TABLE", "outreach-customers")
CAMPAIGN_TABLE_NAME = os.environ.get("DYNAMODB_CAMPAIGN_TABLE", "outreach-campaigns")
CHAT_TABLE_NAME = os.environ.get("DYNAMODB_CHAT_TABLE", "outreach-chat-history")


def get_table_references() -> dict[str, Any]:
    """Get DynamoDB table references."""
    return {
        "customers": dynamodb.Table(CUSTOMER_TABLE_NAME),
        "campaigns": dynamodb.Table(CAMPAIGN_TABLE_NAME),
        "chat_history": dynamodb.Table(CHAT_TABLE_NAME),
    }


def create_customers_table():
    """Create the customers table."""
    dynamodb.create_table(
        AttributeDefinitions=[{"AttributeName": "phone_number", "AttributeType": "S"}],
        TableName=CUSTOMER_TABLE_NAME,
        KeySchema=[{"AttributeName": "phone_number", "KeyType": "HASH"}],
        BillingMode="PAY_PER_REQUEST",
    )


def create_campaigns_table():
    """Create the campaigns table."""
    dynamodb.create_table(
        AttributeDefinitions=[{"AttributeName": "campaign_id", "AttributeType": "S"}],
        TableName=CAMPAIGN_TABLE_NAME,
        KeySchema=[{"AttributeName": "campaign_id", "KeyType": "HASH"}],
        BillingMode="PAY_PER_REQUEST",
    )


def create_chat_history_table():
    """Create the chat history table with a GSI on phone_number and timestamp."""
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


def load_or_create_table(
    table_ref_key: str, table: Any, create_if_missing: bool = True
):
    """
    Load a DynamoDB table, creating it if it does not exist.

    Args:
        table_ref_key: Key identifying the table type ('customers', 'campaigns', 'chat_history')
        table: The DynamoDB Table resource
    Raises:
        Exception: If there is an error loading or creating the table
    """
    try:
        table.load()
        logger.info(f"Connected to DynamoDB table: {table.table_name}")

    except ClientError as e:
        if (
            e.response["Error"]["Code"] == "ResourceNotFoundException"
            and create_if_missing
        ):
            logger.info(f"{table.table_name} table not found, creating it ...")
            if "customers" == table_ref_key:
                create_customers_table()
            if "campaigns" == table_ref_key:
                create_campaigns_table()
            if "chat_history" == table_ref_key:
                create_chat_history_table()
        else:
            logger.error(f"Error loading table {table.table_name}: {e}", exc_info=True)
            raise Exception(f"Failed to load table: {table.table_name}")


def initialize_dynamodb(create_if_missing: bool = False):
    """
    Initialize DynamoDB by testing connection to the tables.

    Args:
        create_if_missing: Whether to create tables if they do not exist.

    Raises:
        Exception: If connection to any table fails.
    """
    try:
        tables = get_table_references()
        for table_ref_key, table in tables.items():
            load_or_create_table(table_ref_key, table, create_if_missing)

    except EndpointConnectionError as e:
        logger.error(f"DynamoDB Endpoint connection error: {e}", exc_info=True)
        raise Exception(f"`Failed to connect to DynamoDB`: {table.table_name}")

    except Exception as e:
        logger.error(f"Error connecting to DynamoDB: {e}", exc_info=True)
        raise Exception(f"Failed to connect to DynamoDB: {table.table_name}")


# Initialize on import
# Create tables if running in test or local environment
initialize_dynamodb(
    create_if_missing=os.environ.get("ENVIRONMENT", "dev") in ["test", "local"]
)
