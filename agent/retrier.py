import asyncio
import random

from botocore.exceptions import ClientError
from pydantic_logging import logfire


async def exponential_backoff_retry(func, max_retries=10, base_delay=4.0):
    """
    Exponential backoff retry logic for handling API throttling.

    Args:
        func: The async function to retry
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (will be exponentially increased)

    Returns:
        The result of the function call

    Raises:
        The last exception if all retries are exhausted
    """
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            # Check if it's a throttling error
            is_throttling = (
                (
                    isinstance(e, ClientError)
                    and e.response.get("Error", {}).get("Code") == "ThrottlingException"
                )
                or (
                    hasattr(e, "__cause__")
                    and isinstance(e.__cause__, ClientError)
                    and e.__cause__.response.get("Error", {}).get("Code")
                    == "ThrottlingException"
                )
                or (
                    "ThrottlingException" in str(e)
                    or "Too many requests" in str(e)
                    or "reached max retries" in str(e)
                )
            )

            if not is_throttling or attempt == max_retries:
                # Not a throttling error or final attempt - re-raise
                raise e

            # Calculate delay with exponential backoff and jitter
            delay = base_delay * (2**attempt) + random.uniform(0, 1)

            logfire.warning(
                f"Throttling detected, retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries + 1})",
                error=str(e),
                attempt=attempt + 1,
                delay=delay,
            )

            await asyncio.sleep(delay)

    # This shouldn't be reached, but just in case
    raise Exception(f"Failed after {max_retries + 1} attempts")
