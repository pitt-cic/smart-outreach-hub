"""System prompt configuration and loading for the sales agent."""

import logging
import pathlib

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = None

__root_dir = pathlib.Path(__file__).parent.parent.resolve()

try:
    with open(__root_dir / "prompts" / "system-prompt.md", "r") as f:
        SYSTEM_PROMPT = f.read()
except Exception as e:
    logger.error(f"Error loading system prompt: {e}")
    raise e
