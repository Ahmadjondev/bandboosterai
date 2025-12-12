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
        ("MANAGER", "Manager"),
        ("STUDENT", "Student"),
        ("TEACHER", "Teacher"),
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
    is_verified = models.BooleanField(default=False, verbose_name="Is Verified")
    verification_code = models.CharField(
        max_length=6, null=True, blank=True, verbose_name="Verification Code"
    )
    code_expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Code Expires At"
    )

    # Telegram Integration
    telegram_id = models.BigIntegerField(
        unique=True, null=True, blank=True, verbose_name="Telegram ID"
    )
    telegram_username = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Telegram Username"
    )
    telegram_phone = models.CharField(
        max_length=20, null=True, blank=True, verbose_name="Telegram Phone"
    )

    # Google Integration
    google_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True, verbose_name="Google ID"
    )

    # Registration Method
    REGISTRATION_METHOD_CHOICES = (
        ("EMAIL", "Email/Password"),
        ("TELEGRAM", "Telegram"),
        ("GOOGLE", "Google"),
    )
    registration_method = models.CharField(
        max_length=20,
        choices=REGISTRATION_METHOD_CHOICES,
        default="EMAIL",
        verbose_name="Registration Method",
    )

    # Balance (in UZS)
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=100000.00, verbose_name="Balance (UZS)"
    )

    # Onboarding Fields
    EXAM_TYPE_CHOICES = (
        ("ACADEMIC", "Academic"),
        ("GENERAL", "General Training"),
        ("UKVI", "UKVI (UK Visas and Immigration)"),
    )

    HEARD_FROM_CHOICES = (
        ("GOOGLE", "Google Search"),
        ("SOCIAL_MEDIA", "Social Media (Instagram, TikTok, etc.)"),
        ("FRIEND", "Friend or Family"),
        ("YOUTUBE", "YouTube"),
        ("TELEGRAM", "Telegram"),
        ("OTHER", "Other"),
    )

    GOAL_CHOICES = (
        ("STUDY_ABROAD", "Study Abroad"),
        ("IMMIGRATION", "Immigration"),
        ("WORK", "Work or Career"),
        ("PERSONAL", "Personal Development"),
        ("OTHER", "Other"),
    )

    TARGET_SCORE_CHOICES = (
        ("5.0", "Band 5.0"),
        ("5.5", "Band 5.5"),
        ("6.0", "Band 6.0"),
        ("6.5", "Band 6.5"),
        ("7.0", "Band 7.0"),
        ("7.5", "Band 7.5"),
        ("8.0", "Band 8.0"),
        ("8.5", "Band 8.5+"),
    )

    target_score = models.CharField(
        max_length=10,
        choices=TARGET_SCORE_CHOICES,
        null=True,
        blank=True,
        verbose_name="Target Score",
    )
    exam_type = models.CharField(
        max_length=20,
        choices=EXAM_TYPE_CHOICES,
        null=True,
        blank=True,
        verbose_name="Exam Type",
    )
    exam_date = models.DateField(
        null=True, blank=True, verbose_name="Planned Exam Date"
    )
    heard_from = models.CharField(
        max_length=30,
        choices=HEARD_FROM_CHOICES,
        null=True,
        blank=True,
        verbose_name="How Did You Hear About Us",
    )
    main_goal = models.CharField(
        max_length=30,
        choices=GOAL_CHOICES,
        null=True,
        blank=True,
        verbose_name="Main Goal",
    )
    onboarding_completed = models.BooleanField(
        default=False, verbose_name="Onboarding Completed"
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
        return self.role == "MANAGER"

    def is_manager(self):
        """Check if user is a manager"""
        return self.role == "MANAGER"

    def is_student(self):
        """Check if user is a student"""
        return self.role == "STUDENT"

    def is_teacher(self):
        """Check if user is a teacher"""
        return self.role == "TEACHER"

    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def generate_verification_code(self, digits=4, expiry_minutes=2):
        """Generate a verification code that expires in specified minutes"""
        min_val = 10 ** (digits - 1)
        max_val = (10**digits) - 1
        self.verification_code = str(random.randint(min_val, max_val))
        self.code_expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
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
        self.is_verified = True
        self.verification_code = None
        self.code_expires_at = None
        self.save(update_fields=["is_verified", "verification_code", "code_expires_at"])

    def calculate_candidate_id(self):
        """Generate a candidate ID based on user ID"""
        return f"CAND-{5000 + self.id}"


class TelegramVerification(models.Model):
    """
    Temporary storage for Telegram verification codes
    """

    telegram_id = models.BigIntegerField(unique=True, verbose_name="Telegram ID")
    phone_number = models.CharField(max_length=20, verbose_name="Phone Number")
    username = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Telegram Username"
    )
    first_name = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="First Name"
    )
    last_name = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Last Name"
    )
    verification_code = models.CharField(max_length=6, verbose_name="Verification Code")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    expires_at = models.DateTimeField(verbose_name="Expires At")
    is_used = models.BooleanField(default=False, verbose_name="Is Used")

    class Meta:
        db_table = "telegram_verifications"
        verbose_name = "Telegram Verification"
        verbose_name_plural = "Telegram Verifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Telegram {self.telegram_id} - {self.phone_number}"

    def is_expired(self):
        """Check if verification code is expired"""
        return timezone.now() > self.expires_at

    def is_valid(self, code):
        """Check if code is valid and not expired"""
        return (
            not self.is_used
            and not self.is_expired()
            and self.verification_code == code
        )

    @classmethod
    def cleanup_expired(cls):
        """Remove expired verification codes"""
        cls.objects.filter(expires_at__lt=timezone.now()).delete()

    @classmethod
    def create_verification(
        cls, telegram_id, phone_number, username=None, first_name=None, last_name=None
    ):
        """Create a new verification with a 6-digit code that expires in 10 minutes"""
        # Generate 6-digit code
        code = str(random.randint(100000, 999999))

        # Delete any existing verification for this telegram_id
        cls.objects.filter(telegram_id=telegram_id).delete()

        # Create new verification
        verification = cls.objects.create(
            telegram_id=telegram_id,
            phone_number=phone_number,
            username=username,
            first_name=first_name,
            last_name=last_name,
            verification_code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        return verification
