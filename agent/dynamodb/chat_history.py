import uuid

from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError
from dynamodb import get_table_references
from dynamodb.models import AddMessageInput, ChatMessage, UpdateChatMessageAttributes
from logging_config import setup_logging
from phone_utils import mask_phone_number

logger = setup_logging(__name__)

chat_table = get_table_references()["chat_history"]


class ChatHistoryDDB:

    @staticmethod
    def get_conversation_history(
        phone_number: str, campaign_id: str | None = None, skip_last: bool = False
    ) -> list[ChatMessage]:
        if not campaign_id:
            logger.warning("Campaign ID is required for conversation history")
            return []

        try:
            response = chat_table.query(
                IndexName="phone_number-timestamp-index",
                KeyConditionExpression=Key("phone_number").eq(phone_number),
                FilterExpression=Attr("campaign_id").eq(campaign_id),
                ScanIndexForward=True,  # Sort by timestamp ascending
            )

            items = response.get("Items", [])
            logger.info(
                f"Retrieved {len(items)} messages for {mask_phone_number(phone_number)} in campaign {campaign_id}"
            )

            messages = [ChatMessage(**item) for item in items]

            if skip_last:
                logger.info("Skipping last message in conversation history")
                return messages[:-1]

            return messages
        except ClientError as e:
            logger.error(
                f"Error retrieving conversation history for {mask_phone_number(phone_number)} in campaign {campaign_id}: {e}",
                exc_info=True,
            )
            return []
        except Exception as e:
            logger.error(
                f"Unexpected error retrieving conversation history: {e}", exc_info=True
            )
            return []

    @staticmethod
    def update_message_attributes(
        message_id: str, attributes: UpdateChatMessageAttributes
    ):
        """Update the attributes for a message."""
        try:
            # Build the update expression and attribute mappings dynamically
            update_expressions = []
            expression_attribute_names = {}
            expression_attribute_values = {}

            for attr_name, attr_value in attributes.as_dict().items():
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
            logger.info(
                f"Updated attributes for message {message_id}: {attributes.as_dict()}"
            )
        except ClientError as e:
            logger.error(
                f"Error updating attributes for message {message_id}: {e}",
                exc_info=True,
            )
            raise Exception(f"Failed to update message attributes for {message_id}")

    @staticmethod
    def add_message(message: AddMessageInput) -> str:
        try:
            message.id = message.id or str(uuid.uuid4())
            item = message.as_dict()
            chat_table.put_item(Item=item)
            return message.id
        except ClientError as e:
            logger.error(f"Error adding message to history: {e}", exc_info=True)
            raise Exception("Failed to add message to history")
