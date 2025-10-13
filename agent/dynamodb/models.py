from dataclasses import dataclass
from enum import StrEnum
from typing import Literal


class CustomerStatus(StrEnum):
    AUTOMATED = "automated"
    NEEDS_RESPONSE = "needs_response"
    AGENT_RESPONDING = "agent_responding"


class UserSentiment(StrEnum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


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
class Customer(DictMixin):
    phone_number: str
    first_name: str
    last_name: str
    status: CustomerStatus
    created_at: str | None = None
    updated_at: str | None = None
    most_recent_campaign_id: str | None = None


@dataclass
class Campaign(DictMixin):
    campaign_id: str
    name: str
    campaign_details: str | None = None


@dataclass
class CreateCampaignInput(DictMixin):
    name: str
    message_template: str
    campaign_details: str | None = None
    campaign_id: str | None = None  # Optional, can be auto-generated if not provided


@dataclass
class ChatMessage(DictMixin):
    id: str
    campaign_id: str
    message: str
    phone_number: str
    direction: Literal["inbound", "outbound"]
    timestamp: str
    response_type: Literal["automated", "ai_agent", "manual"] | None = None
    status: Literal["queued", "sent", "delivered", "failed"] | None = None
    guardrails_intervened: bool | None = None
    user_sentiment: UserSentiment | None = None
    should_handoff: bool | None = None
    sent_at: str | None = None
    external_message_id: str | None = None
    error_message: str | None = None


@dataclass
class UpdateChatMessageAttributes(DictMixin):
    guardrails_intervened: bool | None = None
    user_sentiment: UserSentiment | None = None


@dataclass
class AddMessageInput(DictMixin):
    phone_number: str
    message: str
    direction: Literal["inbound", "outbound"]
    timestamp: str
    id: str | None = None
    campaign_id: str | None = None
    response_type: Literal["automated", "ai_agent", "manual"] | None = None
    guardrails_intervened: bool | None = None
