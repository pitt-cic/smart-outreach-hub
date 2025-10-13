from datetime import datetime, timezone

from botocore.exceptions import ClientError
from dynamodb import get_table_references
from dynamodb.models import Customer, CustomerStatus
from logging_config import setup_logging
from phone_utils import mask_phone_number

logger = setup_logging(__name__)

customer_table = get_table_references()["customers"]


class CustomerDDB:

    @staticmethod
    def get_customer(phone_number: str) -> Customer | None:
        """
        Fetch a customer by phone number.

        Args:
            phone_number: The customer's phone number in E.164 format

        Returns:
            Customer object if found, None otherwise

        Raises:
            Exception: If there is an error fetching the customer
        """
        try:
            response = customer_table.get_item(Key={"phone_number": phone_number})
            if "Item" in response:
                return Customer(**response["Item"])
            return None
        except ClientError as e:
            logger.error(f"Error fetching customer {phone_number}: {e}", exc_info=True)
            raise Exception(
                f"Failed to fetch customer: {mask_phone_number(phone_number)}"
            )

    @staticmethod
    def create_customer(customer: Customer):
        """
        Create a new customer in the database.

        Args:
            customer: Customer object to create

        Raises:
            Exception: If there is an error creating the customer
        """
        try:
            if customer.created_at is None or customer.updated_at is None:
                now = datetime.now(tz=timezone.utc).isoformat()
                customer.created_at = now
                customer.updated_at = now

            customer_table.put_item(Item=customer.as_dict())
        except ClientError as e:
            logger.error(
                f"Error creating customer {customer.phone_number}: {e}", exc_info=True
            )
            raise Exception(
                f"Failed to create customer: {mask_phone_number(customer.phone_number)}"
            )

    @staticmethod
    def get_or_create_customer(
        phone_number: str,
        first_name: str = "Unknown",
        last_name: str = "Customer",
        most_recent_campaign_id: str | None = None,
    ):
        """
        Get an existing customer or create a new one.

        Args:
            phone_number: The customer's phone number in E.164 format
            first_name: First name for new customer (default "Unknown")
            last_name: Last name for new customer (default "Customer")

        Returns:
            Customer object
        """
        customer = CustomerDDB.get_customer(phone_number)
        if customer:
            return customer

        now = datetime.now(tz=timezone.utc).isoformat()

        new_customer = Customer(
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name,
            status=CustomerStatus.AUTOMATED,
            created_at=now,
            updated_at=now,
        )

        if most_recent_campaign_id:
            new_customer.most_recent_campaign_id = most_recent_campaign_id

        CustomerDDB.create_customer(new_customer)
        return new_customer

    @staticmethod
    def update_customer_status(phone_number: str, status: CustomerStatus):
        """
        Update the status of an existing customer.

        Args:
            phone_number: The customer's phone number in E.164 format
            status: New status to set

        Raises:
            Exception: If there is an error updating the customer
        """
        try:
            now = datetime.now(tz=timezone.utc).isoformat()
            customer_table.update_item(
                Key={"phone_number": phone_number},
                UpdateExpression="SET #status = :status, updated_at = :updated_at",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={":status": status.value, ":updated_at": now},
                ReturnValues="NONE",
            )
        except ClientError as e:
            logger.error(
                f"Error updating customer {phone_number} status: {e}", exc_info=True
            )
            raise Exception(
                f"Failed to update customer status: {mask_phone_number(phone_number)}"
            )
