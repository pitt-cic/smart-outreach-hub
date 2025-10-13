import uuid

from botocore.exceptions import ClientError
from dynamodb import get_table_references
from dynamodb.models import Campaign, CreateCampaignInput
from logging_config import setup_logging

logger = setup_logging(__name__)

campaign_table = get_table_references()["campaigns"]


class CampaignDDB:

    @staticmethod
    def get_campaign(campaign_id: str) -> Campaign | None:
        try:
            projection_expression = ", ".join(
                [f"#{field}" for field in Campaign.__dataclass_fields__.keys()]
            )
            expression_attribute_names = {
                f"#{field}": field for field in Campaign.__dataclass_fields__.keys()
            }

            response = campaign_table.get_item(
                Key={"campaign_id": campaign_id},
                ProjectionExpression=projection_expression,
                ExpressionAttributeNames=expression_attribute_names,
            )

            if "Item" in response:
                return Campaign(**response["Item"])

            return None
        except ClientError as e:
            logger.error(f"Error fetching campaign {campaign_id}: {e}", exc_info=True)
            raise Exception(f"Failed to fetch campaign: {campaign_id}")

    @staticmethod
    def create_campaign(campaign: CreateCampaignInput) -> str:
        try:
            campaign.campaign_id = campaign.campaign_id or str(uuid.uuid4())
            item = campaign.as_dict()

            campaign_table.put_item(Item=item)
            return campaign.campaign_id
        except ClientError as e:
            logger.error(f"Error creating campaign: {e}", exc_info=True)
            raise Exception("Failed to create campaign")
