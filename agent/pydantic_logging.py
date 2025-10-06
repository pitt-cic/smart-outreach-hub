import os

import logfire

logfire.configure(token=os.environ["PYDANTIC_LOGFIRE_TOKEN"])
logfire.info("Sales Agent initialized")
logfire.instrument_pydantic_ai()
