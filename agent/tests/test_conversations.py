import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from jinja2 import Environment, FileSystemLoader

from test_utils.database import (
    create_customer,
    add_campaign_message,
    initialize_database,
    cleanup_test_data,
    add_message_to_history,
)

# Add parent directory to path to import main.py
sys.path.append(str(Path(__file__).parent.parent))
from main import process_message


class ConversationTest:
    """Individual conversation test case based on conversation-flows.md examples"""

    def __init__(
        self,
        name: str,
        description: str,
        campaign_name: Optional[str] = None,
        campaign: Optional[str] = None,
        campaign_details: Optional[str] = None,
        user_messages: List[str] = [],
        phone_number: str = "+14445556666",
    ):
        self.name = name
        self.description = description
        self.campaign_name = campaign_name
        self.campaign = campaign
        self.campaign_details = campaign_details
        self.user_messages = user_messages
        self.results = []
        self.duration = 0
        self.success = True
        self.error_messages = []
        self.phone_number = phone_number


with open("test_conversations.json", "r") as f:
    json_data = json.load(f)
    TEST_CONVERSATIONS = [ConversationTest(**test) for test in json_data]


async def get_agent_response_via_process_message(
    phone_number: str, message: str, message_id: str
):
    """
    Use process_message to get the full AgentResponse object.
    This tests the full flow including database operations and provides all metadata.
    """
    try:
        # Use the main process_message function which now returns AgentResponse
        agent_response = await process_message(phone_number, message, message_id)

        # Return the full AgentResponse object for comprehensive testing
        return {"agent_response": agent_response, "success": True}

    except Exception as e:
        print(f"Error getting agent response: {e}")
        return {"agent_response": None, "success": False, "error": str(e)}


async def run_conversation_test(
    test: ConversationTest, cleanup: bool = True
) -> ConversationTest:
    """Run a single conversation test using process_message"""
    print(f"Running test: {test.name}")

    start_time = time.time()

    try:
        # Clean up any existing test data for this phone number
        if cleanup:
            cleanup_test_data(test.phone_number)

        # Add campaign message to database if provided
        campaign_id = None
        if test.campaign:
            print(f"  Campaign: {test.campaign[:50]}...")
            campaign_id = add_campaign_message(
                phone_number=test.phone_number,
                campaign_name=test.campaign_name,
                campaign_message=test.campaign,
                campaign_details=test.campaign_details,
            )
            print(f"  Campaign Message Added: {test.campaign}")

        create_customer(
            phone_number=test.phone_number, most_recent_campaign_id=campaign_id
        )

        # i = 0
        # while True:
        for i in range(len(test.user_messages)):
            user_message = test.user_messages[i]

            # user_message = input(f"Enter user message {f'(default: {test.user_messages[i]})' if i < len(test.user_messages) else ''} (q to quit): ")
            # if not user_message.strip() and i < len(test.user_messages):
            #     user_message = test.user_messages[i]
            # if user_message.strip().lower() == 'q':
            #     break
            message_number = i + 1
            # i += 1
            print()
            print(f"  Using User Message {message_number}: {user_message}")

            # Add incoming user message to history
            message_id = add_message_to_history(
                phone_number=test.phone_number,
                message=user_message,
                direction="inbound",
                campaign_id=campaign_id,
            )

            # Use process_message for full integration testing
            response_wrapper = await get_agent_response_via_process_message(
                test.phone_number, user_message, message_id
            )

            if not response_wrapper["success"]:
                raise Exception(
                    f"Failed to get agent response for message {message_number}: {response_wrapper.get('error', 'Unknown error')}"
                )

            agent_response = response_wrapper["agent_response"]

            # Store the comprehensive result with all metadata
            result = {
                "message_number": message_number,
                "user_message": user_message,
                "timestamp": datetime.now().isoformat(),
            }

            if agent_response:
                # Add outbound agent response to history
                add_message_to_history(
                    phone_number=test.phone_number,
                    message=agent_response.response_text,
                    direction="outbound",
                    response_type="ai_agent",
                    guardrails_intervened=agent_response.guardrails_intervened,
                )

                print(
                    f"  Agent Response {message_number}: {agent_response.response_text}"
                )
                print(
                    f"    Handoff Required: {agent_response.should_handoff}{' (Reason: ' + agent_response.handoff_reason + ')' if agent_response.should_handoff else ''}"
                )

                result["agent_response"] = agent_response.response_text
                result["should_handoff"] = agent_response.should_handoff
                result["user_sentiment"] = agent_response.user_sentiment
                result["handoff_reason"] = agent_response.handoff_reason
                result["request_tokens"] = agent_response.request_tokens
                result["response_tokens"] = agent_response.response_tokens

            test.results.append(result)

            # Use actual handoff detection from AgentResponse
            if agent_response.should_handoff:
                print(f"  ** HANDOFF TRIGGERED at message {message_number}**")
                break

    except Exception as e:
        test.success = False
        test.error_messages.append(str(e))
        print(f"  Error: {e}")

    finally:
        # Clean up test data after each test
        if cleanup:
            cleanup_test_data(test.phone_number)

    test.duration = time.time() - start_time
    print(f"  Completed in {test.duration:.2f}s")
    print(f"  Success: {test.success}")
    print()
    return test


async def run_all_tests(limit: int = None) -> List[ConversationTest]:
    """Run all conversation tests in parallel"""
    num_tests = limit if limit else len(TEST_CONVERSATIONS)
    print(
        f"📋 Testing {num_tests} conversation flow{'' if num_tests == 1 else 's'} in parallel"
    )
    print("=" * 60)
    print()

    tests_to_run = TEST_CONVERSATIONS[:num_tests]

    for i, test in enumerate(tests_to_run, 1):
        test.phone_number = f"+1412555{i:04d}"
        print(f"Test {i}/{num_tests}: {test.name} (phone: {test.phone_number})")

    print("-" * 60)
    print("Running tests in parallel...")
    print()

    results = await asyncio.gather(
        *[run_conversation_test(test) for test in tests_to_run]
    )

    return list(results)


def save_results_json(results: List[ConversationTest], filename: str = None):
    """Save test results to JSON file with comprehensive metadata"""

    # Generate timestamp-based filename if not provided
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_results_{timestamp}.json"

    # Create reports directory
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)

    # Full path for the JSON file
    json_path = reports_dir / filename

    # Calculate detailed metrics
    total_messages = sum(len(r.results) for r in results)
    (
        total_request_tokens,
        total_response_tokens,
        average_request_tokens_per_message,
        average_response_tokens_per_message,
    ) = aggregate_tokens(results)

    json_data = {
        "test_run": {
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(results),
            "successful_tests": sum(1 for r in results if r.success),
            "failed_tests": sum(1 for r in results if not r.success),
            "average_duration": (
                sum(r.duration for r in results) / len(results) if results else 0
            ),
            "total_messages_processed": total_messages,
            "total_request_tokens": total_request_tokens,
            "total_response_tokens": total_response_tokens,
            "average_request_tokens": average_request_tokens_per_message,
            "average_response_tokens": average_response_tokens_per_message,
        },
        "tests": [],
    }

    for test in results:
        json_data["tests"].append(
            {
                "name": test.name,
                "description": test.description,
                "campaign": test.campaign,
                "success": test.success,
                "duration": test.duration,
                "error_messages": test.error_messages,
                "conversation_flow": test.results,
                "request_tokens": sum(
                    test.results[i]["request_tokens"] for i in range(len(test.results))
                ),
                "response_tokens": sum(
                    test.results[i]["response_tokens"] for i in range(len(test.results))
                ),
            }
        )

    with open(json_path, "w") as f:
        json.dump(json_data, f, indent=2)

    print(f"📄 Results saved to {json_path}")


def generate_html_report_jinja2(results: List[ConversationTest], filename: str = None):
    """Generate HTML report using Jinja2 template for better maintainability"""

    # Generate timestamp-based filename if not provided
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_report_{timestamp}.html"

    # Create reports directory
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)

    # Full path for the report file
    report_path = reports_dir / filename

    # Prepare template context data
    successful_tests = sum(1 for r in results if r.success)
    failed_tests = sum(1 for r in results if not r.success)
    average_duration = sum(r.duration for r in results) / len(results) if results else 0

    (
        total_request_tokens,
        total_response_tokens,
        average_request_tokens_per_message,
        average_response_tokens_per_message,
    ) = aggregate_tokens(results)

    # Create summary data
    summary = {
        "total_tests": len(results),
        "successful_tests": successful_tests,
        "failed_tests": failed_tests,
        "average_duration": average_duration,
        "total_request_tokens": total_request_tokens,
        "total_response_tokens": total_response_tokens,
        "average_request_tokens": average_request_tokens_per_message,
        "average_response_tokens": average_response_tokens_per_message,
    }

    # Prepare test results data
    test_results = []
    for test in results:
        test_data = {
            "name": test.name,
            "description": test.description,
            "campaign": test.campaign,
            "campaign_details": test.campaign_details,
            "success": test.success,
            "duration": test.duration,
            "conversation_flow": test.results,  # This contains the message exchanges
            "error_messages": test.error_messages,
            "request_tokens": sum(
                test.results[i]["request_tokens"] for i in range(len(test.results))
            ),
            "response_tokens": sum(
                test.results[i]["response_tokens"] for i in range(len(test.results))
            ),
        }
        test_results.append(test_data)

    # Setup Jinja2 environment
    template_dir = Path(__file__).parent / "templates"

    if not template_dir.exists():
        raise FileNotFoundError(f"Template directory not found: {template_dir}")

    try:
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("test_report.html")

        # Render template with context
        context = {
            "report_timestamp": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "summary": summary,
            "test_results": test_results,
        }

        html_content = template.render(context)

        # Write rendered content to file
        with open(report_path, "w") as f:
            f.write(html_content)

        print(f"📊 HTML report generated using Jinja2 template: {report_path}")

    except Exception as e:
        print(f"⚠️  Error rendering Jinja2 template: {e}")
        raise e


def aggregate_tokens(results: List[ConversationTest]) -> tuple[int, int, int, int]:
    """Aggregate tokens from all results"""
    total_request_tokens = sum(
        r.results[i]["request_tokens"] for r in results for i in range(len(r.results))
    )
    total_response_tokens = sum(
        r.results[i]["response_tokens"] for r in results for i in range(len(r.results))
    )

    # Average tokens per input message
    average_request_tokens_per_message = round(
        total_request_tokens / sum(len(r.results) for r in results)
    )
    average_response_tokens_per_message = round(
        total_response_tokens / sum(len(r.results) for r in results)
    )

    return (
        total_request_tokens,
        total_response_tokens,
        average_request_tokens_per_message,
        average_response_tokens_per_message,
    )


def print_test_summary(results: List[ConversationTest]):
    print("=" * 60)
    print("📈 TEST SUITE SUMMARY")
    print("=" * 60)

    successful = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)

    print(f"Total Tests Run: {len(results)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(
        f"⏱️  Average Duration: {sum(r.duration for r in results) / len(results):.2f}s"
    )
    print()

    # Show failed tests if any
    if failed > 0:
        print("❌ FAILED TESTS:")
        for test in results:
            if not test.success and test.error_messages:
                print(f"    Errors: {', '.join(test.error_messages)}")
        print()


async def main():
    """Main test runner"""
    initialize_database()

    # Run all tests
    results = await run_all_tests()  # Set limit to run specific number of tests

    print_test_summary(results)

    # Save results with matching timestamps
    save_results_json(results, "test_results.json")
    generate_html_report_jinja2(results, "test_report.html")


if __name__ == "__main__":
    asyncio.run(main())
