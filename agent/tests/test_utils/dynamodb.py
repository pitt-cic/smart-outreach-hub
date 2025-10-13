from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from dynamodb import get_table_references
from logging_config import setup_logging

logger = setup_logging(__name__)


def cleanup_test_data(phone_number: str):
    """Clean up test data for a specific phone number."""
    customer_table = get_table_references()["customers"]
    chat_table = get_table_references()["chat_history"]
    campaign_table = get_table_references()["campaigns"]

    try:
        # Get all chat history for this phone number
        chat_history = chat_table.query(
            IndexName="phone_number-timestamp-index",
            KeyConditionExpression=Key("phone_number").eq(phone_number),
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
        customer_table.delete_item(Key={"phone_number": phone_number})
    except ClientError as e:
        logger.error(
            f"Error cleaning up test data for {phone_number}: {e}", exc_info=True
        )
        raise e
    except Exception as e:
        logger.error(
            f"Unexpected error during cleanup for {phone_number}: {e}", exc_info=True
        )
        raise e
