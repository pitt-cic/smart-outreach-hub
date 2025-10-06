import asyncio
import sys
import traceback
from pathlib import Path

# Add parent directory to path to import main.py
sys.path.append(str(Path(__file__).parent.parent))

from test_conversations import ConversationTest, run_conversation_test


async def test_single_conversation(phone_number: str, message: str):
    """Test a single conversation to validate the enhanced test suite"""

    # Create a simple test case
    test = ConversationTest(
        name="Single Conversation Test",
        description="Single conversation test",
        user_messages=[message],
        phone_number=phone_number,
    )

    print("=" * 50)
    print("Running single conversation test")
    print()

    # Run the test
    result = await run_conversation_test(test, cleanup=False)

    print()
    print("📊 VALIDATION RESULTS:")
    print(f"Test Success: {result.success}")
    print(f"Duration: {result.duration:.2f}s")

    if result.final_state:
        print("\n📋 Final State:")
        print(result.final_state)

    if result.results:
        print("\n💬 Conversation Details:")
        for i, msg in enumerate(result.results, 1):
            print(f"  Message {i}:")
            print(f"    User: {msg['user_message']}")
            print(f"    Agent: {msg['agent_response']}")
            print(f"    Intent: {msg.get('intent')}")
            print(f"    Handoff: {msg.get('requires_handoff')}")

    print()
    if not result.success:
        print("❌ Test failed")
        if result.error_messages:
            print(f"Errors: {', '.join(result.error_messages)}")

    return result.success


if __name__ == "__main__":
    try:
        if len(sys.argv) > 2:
            # Command line usage: python test_single.py <phone_number> <message>
            phone_number = sys.argv[1]
            message = " ".join(sys.argv[2:])
            success = asyncio.run(test_single_conversation(phone_number, message))
            sys.exit(0 if success else 1)
        else:
            print(f"Usage: python {sys.argv[0]} <phone_number> <message>")
            print(f"Example: python {sys.argv[0]} '+14445556666' 'Hello, I need help'")
            sys.exit(1)
    except Exception as e:
        traceback.print_exc()
        print(f"\n❌ Error running test: {e}")
        sys.exit(1)
