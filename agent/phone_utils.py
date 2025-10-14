"""Phone number utilities for normalization and validation."""

import phonenumbers
from phonenumbers import NumberParseException


def normalize_phone_number(phone_number: str) -> str:
    """
    Normalize a phone number to E.164 format for consistent database storage.

    Args:
        phone_number: Phone number in any format

    Returns:
        Normalized phone number in E.164 format (e.g., +12128675309)
        Returns original string if parsing fails
    """
    try:
        parsed = phonenumbers.parse(phone_number, "US")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
        return phone_number
    except NumberParseException:
        return phone_number


def validate_phone_number(phone_number: str) -> bool:
    """
    Validate if a phone number is a valid US phone number.

    Args:
        phone_number: Phone number to validate

    Returns:
        True if valid US phone number, False otherwise
    """
    try:
        parsed = phonenumbers.parse(phone_number, "US")
        return phonenumbers.is_valid_number(parsed)
    except NumberParseException:
        return False


def format_phone_number(phone_number: str) -> str:
    """
    Format a phone number for display purposes.

    Args:
        phone_number: Phone number in any format

    Returns:
        Formatted phone number in national format (e.g., (212) 867-5309)
        Returns original string if parsing fails
    """
    try:
        parsed = phonenumbers.parse(phone_number, "US")
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.NATIONAL
            )
        return phone_number
    except NumberParseException:
        return phone_number


def mask_phone_number(phone_number: str) -> str:
    """
    Mask a phone number for privacy, showing only the last 4 digits.

    Args:
        phone_number: Phone number
    Returns:
        Masked phone number (e.g., ***-***-5309)
        Returns original string if too short to mask
    """

    if len(phone_number) >= 4:
        return f"***-***-{phone_number[-4:]}"
    return phone_number
