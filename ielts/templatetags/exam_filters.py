from django import template

register = template.Library()


@register.filter(name="get_item")
def get_item(dictionary, key):
    """Get an item from a dictionary"""
    if dictionary is None:
        return None
    return dictionary.get(key)


@register.filter(name="format_price")
def format_price(value):
    """
    Format a number with spaces as thousand separators.
    Example: 150000 -> "150 000"
    Returns "Free" if value is None or 0
    """
    if value is None or value == 0:
        return "Free"
    try:
        # Convert to integer and format with spaces
        num = int(float(value))
        if num == 0:
            return "Free"
        # Format with spaces as thousand separator
        return f"{num:,}".replace(",", " ")
    except (ValueError, TypeError):
        return "Free" if value is None else value


@register.filter(name="format_max_students")
def format_max_students(value):
    """
    Format max students count.
    Returns "Unlimited" if value is None
    """
    if value is None:
        return "Unlimited"
    try:
        return str(int(value))
    except (ValueError, TypeError):
        return "Unlimited"
