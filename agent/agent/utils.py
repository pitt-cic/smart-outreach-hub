from dynamodb.models import ChatMessage
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart


def convert_history_to_messages(
    conversation_history: list[ChatMessage],
) -> list[ModelRequest | ModelResponse]:
    """Convert database conversation history to pydantic-ai message format."""
    messages = []
    for msg in conversation_history:
        # Skip messages that have been intervened by guardrails
        if msg.guardrails_intervened:
            continue
        if msg.direction == "inbound":
            # User message
            content = msg.message
            messages.append(ModelRequest(parts=[UserPromptPart(content=content)]))
        else:
            # Campaign message or AI response or manual response from human agent
            messages.append(ModelResponse(parts=[TextPart(content=msg.message)]))
    return messages
