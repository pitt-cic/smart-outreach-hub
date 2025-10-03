def format_field_value(value):
    """
    Format field values by splitting on underscores and converting to title case.
    Returns None if the input is None, otherwise converts string to Title Case.
    
    Examples:
        - "ready_for_handoff" -> "Ready For Handoff"
        - "continue_conversation" -> "Continue Conversation"
        - None -> None
        - "high" -> "High"
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value.replace('_', ' ').title()
    return value


def format_collected_info(collected_info):
    """
    Format collected_info dictionary into a readable string.
    Returns None if the dictionary is None or empty.
    
    Examples:
        - {} -> None
        - None -> None
        - {"purchase": {"event": "Kickoff Luncheon", "tickets": 3}} -> "Purchase: event=Kickoff Luncheon, tickets=3"
        - {"sport": "football", "interest": "tickets"} -> "sport=football, interest=tickets"
    """
    if not collected_info or collected_info is None:
        return None
    
    def format_dict_items(d):
        """Recursively format dictionary items into key=value pairs"""
        if isinstance(d, str) or d is None:
            return d
        
        items = []
        for key, value in d.items():
            if isinstance(value, dict):
                # For nested dictionaries, show as "key: nested_items"
                nested_items = format_dict_items(value)
                if nested_items:
                    items.append(f"{format_field_value(key)}: {nested_items}")
            elif isinstance(value, (str, int, float, bool)):
                # Format the key and keep the value as-is
                formatted_key = format_field_value(key) if isinstance(key, str) else str(key)
                items.append(f"{formatted_key}={value}")
            elif isinstance(value, list):
                # For lists, join the items
                formatted_key = format_field_value(key) if isinstance(key, str) else str(key)
                items.append(f"{formatted_key}={', '.join(map(str, value))}")
        return ", ".join(items)
    
    return format_dict_items(collected_info)
