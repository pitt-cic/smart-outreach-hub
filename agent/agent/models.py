"""Data models for agent responses and context."""

from typing import Literal

from pydantic import BaseModel
from pydantic.dataclasses import dataclass


class AgentResponse(BaseModel):
    """
    This is the response model for the agent.

    Args:
        response_text: concise SMS-optimized message to send to user (under 160 characters)
        user_sentiment: sentiment of the user's message
        should_handoff: True when interaction with AI agent is complete and human is taking over.
        handoff_reason: reason that human handoff is needed when should_handoff is true
    """

    response_text: str
    should_handoff: bool
    handoff_reason: str | None = None
    user_sentiment: Literal["positive", "neutral", "negative"] | None = None

    def as_dict(self) -> dict:
        """Return a dictionary of all fields and their values"""
        data = {k: v for k, v in self.model_dump().items() if v is not None}
        return data


class AgentResponseWrapper(AgentResponse):
    """
    This is a derived class from AgentResponse that is used to indicate that the guardrails intervened.
    """

    guardrails_intervened: bool = False
    request_tokens: int = 0
    response_tokens: int = 0
    campaign_id: str | None = None

    def as_dict(self) -> dict:
        """Return a dictionary of all fields and their values"""
        data = super().as_dict()
        data["guardrails_intervened"] = self.guardrails_intervened
        data["campaign_id"] = self.campaign_id
        return data


@dataclass
class AgentContext:
    """Context information for agent interactions including customer details and campaign data."""

    customer_phone_number: str
    customer_name: str
    customer_email: str | None = None
    most_recent_campaign_id: str | None = None
