import logging
import os
import sys


def setup_logging(
    name=None,
    level=logging.INFO,
    log_file=None,
    format_string=None,
    disable_existing=True,
):
    """
    Set up logging configuration that can be reused across modules.

    Args:
        name: Logger name (default: root logger)
        level: Logging level (default: INFO)
        log_file: Optional log file path
        format_string: Custom format string
        disable_existing: Disable existing loggers (default: True)

    Returns:
        Logger instance
    """
    # Default format
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    datefmt = "%Y-%m-%d %H:%M:%S"

    # Create formatter
    formatter = logging.Formatter(fmt=format_string, datefmt=datefmt)

    # Get logger
    logger = logging.getLogger(name)
    level = os.environ.get("LOG_LEVEL", level)
    logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    # Disable propagation to avoid duplicate logs
    logger.propagate = False

    # Optionally disable existing loggers
    if disable_existing:
        logging.disable(logging.NOTSET)
        logging.disable(logging.NOTSET)

    return logger
