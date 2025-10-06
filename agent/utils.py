"""Utility functions for AWS configuration, HTTP requests, and datetime formatting."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import requests


def get_boto3_session_config() -> Dict[str, Any]:
    """Get boto3 session configuration based on environment settings."""
    config = {"region_name": os.environ.get("AWS_REGION", "us-east-1")}
    if os.environ["ENVIRONMENT"] in ["test", "local"]:
        if "AWS_PROFILE" in os.environ:
            config["profile_name"] = os.environ["AWS_PROFILE"]
        elif all(
            key in os.environ
            for key in (
                "AWS_ACCESS_KEY_ID",
                "AWS_SECRET_ACCESS_KEY",
                "AWS_SESSION_TOKEN",
            )
        ):
            config["aws_access_key_id"] = os.environ["AWS_ACCESS_KEY_ID"]
            config["aws_secret_access_key"] = os.environ["AWS_SECRET_ACCESS_KEY"]
            config["aws_session_token"] = os.environ["AWS_SESSION_TOKEN"]
        elif all(
            key in os.environ for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
        ):
            config["aws_access_key_id"] = os.environ["AWS_ACCESS_KEY_ID"]
            config["aws_secret_access_key"] = os.environ["AWS_SECRET_ACCESS_KEY"]
        else:
            raise ValueError(
                f'AWS credentials must be set for {os.environ["ENVIRONMENT"]} environment.'
            )

    return config


def get_dynamodb_resource_config() -> Dict[str, Any]:
    """Get DynamoDB resource configuration for local or AWS environments."""
    config = {}
    if os.environ["ENVIRONMENT"] in ["test", "local"]:
        config["endpoint_url"] = "http://localhost:8000"  # DynamoDB Local
    return config


def get_request(url, params=None, headers=None):
    """
    Make a GET request to the specified URL with optional parameters and headers.
    Returns the JSON response if successful, otherwise raises an exception.
    """
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


def post_request(url, data=None, json=None, headers=None):
    """
    Make a POST request to the specified URL with optional data, JSON body, and headers.
    Returns the JSON response if successful, otherwise raises an exception.
    """

    response = requests.post(url, data=data, json=json, headers=headers)
    response.raise_for_status()
    return response.json()


def check_if_valid_iso_date(date_str: str) -> bool:
    """
    Check if the given string is a valid ISO 8601 date.
    """
    try:
        datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def convert_datetime_to_iso(datetime_obj: datetime):
    """Convert datetime object to ISO format string with UTC timezone."""
    if datetime_obj.tzinfo is None:
        # Convert naive datetime to UTC
        datetime_obj = datetime_obj.astimezone(tz=timezone.utc)
        return datetime_obj.isoformat(sep="T").replace("+00:00", "Z")
    else:
        # If datetime is already timezone-aware, just convert to ISO format
        return datetime_obj.isoformat(sep="T").replace("+00:00", "Z")


def format_utc_to_friendly_est(utc_date_str: str) -> str:
    """
    Convert UTC datetime string to user-friendly EST format.

    Converts strings like "2025-08-07T20:00:00Z" or "2025-08-07T20:00:00.000000Z"
    to "Aug 7th, 4 PM EST"

    Args:
        utc_date_str: UTC datetime string in ISO format with Z suffix

    Returns:
        Formatted datetime string in EST timezone
    """
    # Remove microseconds if present and handle Z suffix
    clean_date_str = utc_date_str.replace("Z", "+00:00")
    if "." in clean_date_str:
        clean_date_str = clean_date_str.split(".")[0] + "+00:00"

    # Parse UTC datetime
    utc_dt = datetime.fromisoformat(clean_date_str)

    # Convert to EST (UTC-4 for EDT/UTC-5 for EST - using EDT for summer time)
    est_tz = timezone(timedelta(hours=-4))
    est_dt = utc_dt.astimezone(est_tz)

    # Format month
    month_name = est_dt.strftime("%b")

    # Format day with ordinal suffix
    day = est_dt.day
    if 10 <= day % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")

    # Format time (12-hour format)
    hour = est_dt.hour
    minute = est_dt.minute

    if hour == 0:
        time_str = f"12:{minute:02d} AM"
    elif hour < 12:
        time_str = f"{hour}:{minute:02d} AM"
    elif hour == 12:
        time_str = f"12:{minute:02d} PM"
    else:
        time_str = f"{hour - 12}:{minute:02d} PM"

    return f"{month_name} {day}{suffix}, {time_str} EST"


def format_first_five_time_slots(slots: list[dict[str, Any]]) -> str:
    """Format the first five time slots into a friendly string representation."""
    first_five_slots = []
    for slot in slots[:5]:
        start_time = slot.get("start_time")
        if start_time:
            first_five_slots.append(format_utc_to_friendly_est(slot["start_time"]))

    if first_five_slots:
        return " | ".join(first_five_slots)

    return "No available time slots"
