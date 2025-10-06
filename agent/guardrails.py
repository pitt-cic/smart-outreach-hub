"""Content guardrails and safety checks for agent responses."""

import os
from typing import Optional

import boto3

from logging_config import setup_logging
from utils import get_boto3_session_config

logger = setup_logging(__name__)


session = boto3.Session(**get_boto3_session_config())
bedrock = session.client("bedrock-runtime")


def apply_guardrails(text: str, source: str = "INPUT") -> tuple[bool, Optional[str]]:
    """
    Apply guardrails to the text content.

    :type text: str
    :param text: The text content to validate.
    :type source: str
    :param source: The source of the text content (`INPUT` or `OUTPUT`).

    :rtype: tuple[bool, dict[str, Any]]
    :return: A tuple containing a boolean indicating if the text content is valid and the response from the guardrails.
    """
    guardrail_id = os.environ.get("BEDROCK_GUARDRAIL_ID")
    guardrail_version = os.environ.get("BEDROCK_GUARDRAIL_VERSION")
    if not (guardrail_id and guardrail_version):
        raise ValueError(
            "BEDROCK_GUARDRAIL_ID and BEDROCK_GUARDRAIL_VERSION must be set in environment variables."
        )

    if source != "INPUT" and source != "OUTPUT":
        raise ValueError("Source must be either 'INPUT' or 'OUTPUT'.")

    response = bedrock.apply_guardrail(
        guardrailIdentifier=guardrail_id,
        guardrailVersion=guardrail_version,
        source=source,
        content=[{"text": {"text": text}}],
    )

    if "GUARDRAIL_INTERVENED" == response.get("action"):
        return False, get_guardrails_response(response)

    return True, None


def get_guardrails_response(response: dict) -> str:
    """Extract text response from guardrails API response or return fallback message."""
    if isinstance(response.get("outputs"), list) and len(response["outputs"]) > 0:
        return response["outputs"][0]["text"]

    return "I'm experiencing high demand right now. Please try again in a few moments. Thanks for your patience! H2P! 🐾"
