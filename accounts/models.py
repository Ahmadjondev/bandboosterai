from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import random
from datetime import timedelta


class User(AbstractUser):
    """
    Custom User model with role-based access control
    """

    ROLE_CHOICES = (
        ("SUPERADMIN", "Super Admin"),
        ("MANAGER", "Manager"),
        ("STUDENT", "Student"),
    )

    # Role
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="STUDENT", verbose_name="User Role"
    )

    # Override email to make it optional
    email = models.EmailField(blank=True, null=True, verbose_name="Email Address")

    # Additional Fields
    phone = models.CharField(
        max_length=20, unique=False, null=True, blank=True, verbose_name="Phone Number"
    )
    date_of_birth = models.DateField(
        null=True, blank=True, verbose_name="Date of Birth"
    )
    profile_image = models.ImageField(
        upload_to="profiles/", null=True, blank=True, verbose_name="Profile Image"
    )

    # Email Verification
    email_verified = models.BooleanField(default=False, verbose_name="Email Verified")
    verification_code = models.CharField(
        max_length=4, null=True, blank=True, verbose_name="Verification Code"
    )
    code_expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Code Expires At"
    )

    # Timestamps (auto-managed)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["username"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def is_superadmin(self):
        """Check if user is a super admin"""
        return self.role == "SUPERADMIN"

    def is_manager(self):
        """Check if user is a manager"""
        return self.role == "MANAGER"

    def is_student(self):
        """Check if user is a student"""
        return self.role == "STUDENT"

    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def generate_verification_code(self):
        """Generate a 4-digit verification code that expires in 2 minutes"""
        self.verification_code = str(random.randint(1000, 9999))
        self.code_expires_at = timezone.now() + timedelta(minutes=2)
        self.save(update_fields=["verification_code", "code_expires_at"])
        return self.verification_code

    def is_verification_code_valid(self, code):
        """Check if the verification code is valid and not expired"""
        if not self.verification_code or not self.code_expires_at:
            return False
        if self.verification_code != code:
            return False
        if timezone.now() > self.code_expires_at:
            return False
        return True

    def verify_email(self):
        """Mark email as verified and clear verification code"""
        self.email_verified = True
        self.verification_code = None
        self.code_expires_at = None
        self.save(
            update_fields=["email_verified", "verification_code", "code_expires_at"]
        )

    def calculate_candidate_id(self):
        """Generate a candidate ID based on user ID"""
        return f"CAND-{5000 + self.id}"
