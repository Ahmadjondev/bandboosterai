from django import template

register = template.Library()


@register.filter(name="format_price")
def format_price(value):
    """
    Format a number with spaces as thousand separators.
    Example: 150000 -> "150 000"
    """
    try:
        # Convert to integer and format with spaces
        num = int(float(value))
        # Format with spaces as thousand separator
        return f"{num:,}".replace(",", " ")
    except (ValueError, TypeError):
        return value
