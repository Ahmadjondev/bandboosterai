from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import User


class LoginForm(AuthenticationForm):
    username = forms.CharField(required=True, widget=forms.TextInput(attrs={}))
    password = forms.CharField(required=True, widget=forms.PasswordInput(attrs={}))

    class Meta:
        model = User
        fields = ["username", "password"]
