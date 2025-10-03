import asyncio
import sys
from pathlib import Path
import traceback

sys.path.append(str(Path(__file__).parent.parent))

# Import the test suite
from test_conversations import main as run_tests

def print_banner():
    print("🔄 Running Sales Agent Test Results")
    print("=" * 60)
    print("This will run all conversation flow tests and update:")
    print("- test_results.json (raw data)")
    print("- test_report.html (visual report)")
    print()

async def regenerate():
    """Regenerate all test results"""
    print("🚀 Starting Sales Agent Test Suite")
    print("=" * 60)
    print()
    
    # Run the tests
    await run_tests()
    
    print()
    print("🎉 Test regeneration complete!")
    print()


if __name__ == "__main__":
    try:
        asyncio.run(regenerate())
    except KeyboardInterrupt:
        print("\n❌ Test regeneration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during test regeneration: {e}")
        traceback.print_exc()
        print("\nPossible issues:")
        print("- Make sure you're in the agent/tests directory")
        print("- Ensure main.py is working correctly")
        print("- Check that all dependencies are installed")
        sys.exit(1)
