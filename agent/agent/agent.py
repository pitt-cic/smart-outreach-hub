"""Sales agent implementation using pydantic-ai for customer interactions."""

import os

import boto3
from pydantic_ai import Agent, RunContext, ToolOutput
from pydantic_ai.models.bedrock import BedrockConverseModel

from agent.models import AgentContext, AgentResponse
from agent.prompt import SYSTEM_PROMPT
from database import get_campaign_by_id
from utils import get_boto3_session_config

session = boto3.Session(**get_boto3_session_config())
bedrock_client = session.client("bedrock-runtime")

# Initialize the Bedrock model
bedrock_model = BedrockConverseModel(model_name=os.environ["BEDROCK_MODEL_NAME"])

# Sales rep agent with structured output and knowledge base tool
sales_agent = Agent[AgentContext, AgentResponse](
    model=bedrock_model,
    instructions=SYSTEM_PROMPT,
    output_type=ToolOutput(AgentResponse),
)


@sales_agent.instructions
async def add_campaign_context(ctx: RunContext[AgentContext]) -> str:
    """Add campaign context to agent instructions based on the most recent campaign."""
    campaign_details = "No campaign context available."
    if ctx.deps.most_recent_campaign_id:
        campaign = get_campaign_by_id(ctx.deps.most_recent_campaign_id)
        if campaign and campaign.get("campaign_details"):
            campaign_details = campaign["campaign_details"]

    return f"<campaign_context>{campaign_details}</campaign_context>"
