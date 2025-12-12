from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "date_of_birth",
            "profile_image",
            "profile_image_url",
            "is_verified",
            "google_id",
            "registration_method",
            "balance",
            "created_at",
            # Onboarding fields
            "target_score",
            "exam_type",
            "exam_date",
            "heard_from",
            "main_goal",
            "onboarding_completed",
        ]
        read_only_fields = [
            "id",
            "is_verified",
            "google_id",
            "registration_method",
            "balance",
            "created_at",
            "profile_image_url",
            "onboarding_completed",
        ]

    def get_profile_image_url(self, obj):
        """
        Get full URL for profile image from S3 or local storage.
        S3 URLs are already absolute, local URLs need request context.
        """
        if obj.profile_image:
            file_url = obj.profile_image.url

            # If it's already an absolute URL (S3), return it directly
            if file_url.startswith("http://") or file_url.startswith("https://"):
                return file_url

            # Otherwise, build absolute URL for local files
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(file_url)
            return file_url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
        ]

    def validate_email(self, value):
        """Check if email is already registered"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """Check if username is already taken"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "A user with that username already exists."
            )
        return value

    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        """Create a new user"""
        # Remove confirm_password as it's not needed for user creation
        validated_data.pop("confirm_password")

        # Create user with STUDENT role by default
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role="STUDENT",  # All registrations are students by default
            registration_method="EMAIL",  # Email/password registration
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""

    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Validate credentials"""
        return attrs


class OnboardingSerializer(serializers.ModelSerializer):
    """Serializer for user onboarding data"""

    class Meta:
        model = User
        fields = [
            "date_of_birth",
            "target_score",
            "exam_type",
            "exam_date",
            "heard_from",
            "main_goal",
        ]

    def validate_date_of_birth(self, value):
        """Validate that the user is at least 10 years old"""
        from datetime import date

        if value:
            today = date.today()
            age = (
                today.year
                - value.year
                - ((today.month, today.day) < (value.month, value.day))
            )
            if age < 10:
                raise serializers.ValidationError("You must be at least 10 years old.")
            if age > 100:
                raise serializers.ValidationError("Please enter a valid date of birth.")
        return value

    def validate_exam_date(self, value):
        """Validate that the exam date is in the future"""
        from datetime import date

        if value and value < date.today():
            raise serializers.ValidationError("Exam date must be in the future.")
        return value

    def update(self, instance, validated_data):
        """Update user with onboarding data and mark as completed"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.onboarding_completed = True
        instance.save()
        return instance
