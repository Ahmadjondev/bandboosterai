from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordChangeForm

User = get_user_model()


class StudentProfileForm(forms.ModelForm):
    """Form for editing student profile"""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "date_of_birth"]
        widgets = {
            "first_name": forms.TextInput(
                attrs={
                    "class": "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                    "placeholder": "Enter your first name",
                }
            ),
            "last_name": forms.TextInput(
                attrs={
                    "class": "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                    "placeholder": "Enter your last name",
                }
            ),
            "phone": forms.TextInput(
                attrs={
                    "class": "w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed",
                    "readonly": "readonly",
                    "placeholder": "+998 90 123 45 67",
                }
            ),
            "date_of_birth": forms.DateInput(
                attrs={
                    "class": "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                    "type": "date",
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make phone field read-only
        self.fields["phone"].disabled = True


class StudentPasswordChangeForm(PasswordChangeForm):
    """Custom password change form with styling"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Add custom CSS classes to all fields
        for field_name in ["old_password", "new_password1", "new_password2"]:
            self.fields[field_name].widget.attrs.update(
                {
                    "class": "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                }
            )

        # Update labels
        self.fields["old_password"].label = "Current Password"
        self.fields["new_password1"].label = "New Password"
        self.fields["new_password2"].label = "Confirm New Password"

        # Update help text
        self.fields["new_password1"].help_text = (
            "Password must be at least 8 characters long and contain letters and numbers."
        )
