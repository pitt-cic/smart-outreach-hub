from typing import Dict, List

from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart


def convert_history_to_messages(
    conversation_history: List[Dict],
) -> List[ModelRequest | ModelResponse]:
    """Convert database conversation history to pydantic-ai message format."""
    messages = []
    for msg in conversation_history:
        # Skip messages that have been intervened by guardrails
        if msg.get("guardrails_intervened", False):
            continue
        if msg["direction"] == "inbound":
            # User message
            content = msg["message"]
            messages.append(ModelRequest(parts=[UserPromptPart(content=content)]))
        else:
            # Campaign message or AI response or manual response from human agent
            messages.append(ModelResponse(parts=[TextPart(content=msg["message"])]))
    return messages
