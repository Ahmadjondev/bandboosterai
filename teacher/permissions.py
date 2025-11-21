from rest_framework import permissions


class IsTeacher(permissions.BasePermission):
    """
    Custom permission to only allow teachers to access teacher views
    """

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_teacher()
        )


class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow teachers to edit, but allow read-only for others
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user and request.user.is_authenticated and request.user.is_teacher()
        )
