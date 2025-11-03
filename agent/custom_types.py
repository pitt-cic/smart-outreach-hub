from dataclasses import dataclass, field

class DictMixin:
    """Mixin to convert dataclass to dictionary"""

    def as_dict(self):
        """Convert the dataclass to a dictionary, excluding None values."""
        return {
            field: getattr(self, field)
            for field in self.__class__.__dataclass_fields__
            if getattr(self, field) is not None
        }

@dataclass
class OutboundSQSMessageBody(DictMixin):
    phoneNumber: str
    agentResponse: dict
    campaignId: str | None
    timestamp: str

@dataclass
class OutboundSQSMessageAttributes(DictMixin):
    messageType: str = "agent_response"
    campaignId: str | None = None

    def to_sqs_format(self):
        """Convert attributes to SQS message attribute format."""
        return {
            key: self._to_attribute_object(value)
            for key, value in self.as_dict().items()
            if value is not None
        }
    
    def _to_attribute_object(self, value: str) -> dict:
        """Helper method to convert a string value to SQS attribute object format."""
        if isinstance(value, str):
            return {"DataType": "String", "StringValue": value}
        if isinstance(value, int):
            return {"DataType": "Number", "StringValue": str(value)}
        raise ValueError("Unsupported attribute type")
