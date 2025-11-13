"""
Manager API - Common utilities and permissions
"""

from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator


def check_manager_permission(user):
    """Check if user has manager permissions"""
    print(user.is_authenticated)
    if not user.is_authenticated:
        return False
    return user.role in ["MANAGER", "SUPERADMIN"]


def paginate_queryset(queryset, request, per_page=25):
    """Paginate a queryset"""
    page = request.GET.get("page", 1)
    paginator = Paginator(queryset, per_page)

    try:
        page_obj = paginator.page(page)
    except:
        page_obj = paginator.page(1)

    return {
        "results": page_obj.object_list,
        "pagination": {
            "current_page": page_obj.number,
            "total_pages": paginator.num_pages,
            "total_items": paginator.count,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        },
    }


def permission_denied_response():
    """Return a standardized permission denied response"""
    return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
