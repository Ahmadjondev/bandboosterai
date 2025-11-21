from pathlib import Path
from decouple import config
import os

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = config(
    "SECRET_KEY",
    default="django-insecure-xww01o1v3nx4p5mv2$pwpo1h867xvebn9^w4yi^q%i*=x1wm^@",
)

DEBUG = config("DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "corsheaders",  # Add CORS support
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",  # JWT token blacklist
    "storages",  # Django storages for S3
    # Local apps
    "accounts",
    "ielts",
    "manager_panel",
    "teacher",  # Teacher Room module
    "books",  # Book-based practice system
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must be before CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # For static files in production
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "mockexam.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.media",
                "mockexam.context_processors.static_version",  # Cache busting
            ],
        },
    },
]

WSGI_APPLICATION = "mockexam.wsgi.application"


# Database configuration with PostgreSQL support
DB_ENGINE = config("DB_ENGINE", default="django.db.backends.sqlite3")

if DB_ENGINE == "django.db.backends.postgresql":
    # PostgreSQL configuration
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="mockexam_db"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
            "CONN_MAX_AGE": 600,  # Connection pooling
            "OPTIONS": {
                "connect_timeout": 10,
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    "accounts.backends.PhoneOrUsernameBackend",  # Custom backend for phone/username login
    "django.contrib.auth.backends.ModelBackend",  # Fallback to default
]


AUTH_PASSWORD_VALIDATORS = [
    # {
    #     "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    # },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    # {
    #     "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    # },
    # {
    #     "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    # },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Tashkent"

USE_I18N = True

USE_TZ = True


STATIC_URL = "/static/"

STATIC_VERSION = config("STATIC_VERSION", default="1.0.0")

if DEBUG:
    STATICFILES_DIRS = [BASE_DIR / "static"]
else:
    STATIC_ROOT = BASE_DIR / "staticfiles"

# ============================================================================
# TIMEWEB S3 OBJECT STORAGE CONFIGURATION
# ============================================================================

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="ru-1")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="https://s3.timeweb.com")

# Alternative Timeweb endpoint (if needed)
# AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="https://s3.twcstorage.ru")

# S3 File Storage Settings
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": "max-age=86400",  # Cache files for 24 hours
}

# File access settings
AWS_DEFAULT_ACL = "public-read"  # Make files publicly accessible
AWS_S3_FILE_OVERWRITE = False  # Don't overwrite files with same name
AWS_QUERYSTRING_AUTH = False  # Don't add authentication query parameters to URLs

# Custom domain (optional - for CDN or custom domain)
# AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.timeweb.com"
AWS_S3_CUSTOM_DOMAIN = None

# Location paths for different file types
AWS_MEDIA_LOCATION = "media"  # Media files subfolder in bucket
AWS_STATIC_LOCATION = "static"  # Static files subfolder (if using S3 for static)

# Media files configuration
# Use S3 storage in production (DEBUG=False) if credentials are available
USE_S3_STORAGE = (
    not DEBUG
    and AWS_ACCESS_KEY_ID
    and AWS_SECRET_ACCESS_KEY
    and AWS_STORAGE_BUCKET_NAME
)

if USE_S3_STORAGE:
    # Use S3 for media files via our custom backend
    # This points to `storage_backends.MediaStorage` so we can set defaults
    # such as location, default_acl, and file_overwrite in one place.
    DEFAULT_FILE_STORAGE = "mockexam.storage_backends.MediaStorage"

    # Generate public URL for media files
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_MEDIA_LOCATION}/"
    else:
        # Use Timeweb S3 endpoint format
        MEDIA_URL = (
            f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/{AWS_MEDIA_LOCATION}/"
        )

    # Configure the storage backend
    STORAGES = {
        "default": {
            "BACKEND": "mockexam.storage_backends.MediaStorage",
            "OPTIONS": {
                "access_key": AWS_ACCESS_KEY_ID,
                "secret_key": AWS_SECRET_ACCESS_KEY,
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "region_name": AWS_S3_REGION_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "location": AWS_MEDIA_LOCATION,
                "default_acl": AWS_DEFAULT_ACL,
                "file_overwrite": AWS_S3_FILE_OVERWRITE,
                "querystring_auth": AWS_QUERYSTRING_AUTH,
                "object_parameters": AWS_S3_OBJECT_PARAMETERS,
                "custom_domain": AWS_S3_CUSTOM_DOMAIN,
            },
        },
        "staticfiles": {
            "BACKEND": (
                "whitenoise.storage.CompressedStaticFilesStorage"
                if not DEBUG
                else "django.contrib.staticfiles.storage.StaticFilesStorage"
            ),
        },
    }

    # Optional: Use S3 for static files as well (uncomment if needed)
    # STATICFILES_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    # STATIC_URL = f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/{AWS_STATIC_LOCATION}/"

else:
    # Fallback to local file storage (for development without S3)
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

    if DEBUG:
        STORAGES = {
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
            },
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
            },
        }
    else:
        STORAGES = {
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
            },
            "staticfiles": {
                "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
            },
        }

# Print storage configuration on startup
print(f"[STORAGE CONFIG] DEBUG={DEBUG}, USE_S3_STORAGE={USE_S3_STORAGE}")
if USE_S3_STORAGE:
    print(f"[STORAGE CONFIG] Using Timeweb S3: {AWS_STORAGE_BUCKET_NAME}")
else:
    print(f"[STORAGE CONFIG] Using local file storage: {MEDIA_ROOT}")

# Login URLs
# LOGIN_URL = "/login/"
# LOGIN_REDIRECT_URL = "/"
# LOGOUT_REDIRECT_URL = "/login/"

LOGIN_URL = None

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Configure CORS for cross-domain requests (when frontend is on different domain)
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080",
).split(",")

# For development, you can use CORS_ALLOW_ALL_ORIGINS = True (NOT for production!)
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)

CORS_ALLOW_CREDENTIALS = True  # Required for session/cookie authentication

# Expose necessary headers to the frontend
CORS_EXPOSE_HEADERS = [
    "Content-Type",
    "X-CSRFToken",
]

# Allow necessary headers from the frontend
CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "accept",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ============================================================================
# SESSION CONFIGURATION
# ============================================================================
SESSION_COOKIE_AGE = 86400  # 24 hours in seconds (1 day)
SESSION_SAVE_EVERY_REQUEST = True  # Update session on every request
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Don't expire when browser closes

# For development with cross-origin (frontend on localhost:3000, backend on 127.0.0.1:8001)
SESSION_COOKIE_SECURE = config(
    "SESSION_COOKIE_SECURE", default=False, cast=bool
)  # Set to False for HTTP in development
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
SESSION_COOKIE_SAMESITE = "Lax"  # Allow cross-origin cookies in development
SESSION_COOKIE_NAME = "sessionid"  # Explicit session cookie name

# For production with HTTPS, use:
# SESSION_COOKIE_SECURE = True
# SESSION_COOKIE_SAMESITE = "None"
# SESSION_COOKIE_DOMAIN = ".yourdomain.com"

SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Use database-backed sessions

# ============================================================================
# CSRF CONFIGURATION
# ============================================================================
CSRF_COOKIE_AGE = 86400  # 24 hours (match session age)

# For development with cross-origin
CSRF_COOKIE_SECURE = config(
    "CSRF_COOKIE_SECURE", default=False, cast=bool
)  # Set to False for HTTP in development
CSRF_COOKIE_HTTPONLY = False  # JavaScript needs to read CSRF token
CSRF_COOKIE_SAMESITE = None  # Allow cross-origin cookies in development
CSRF_COOKIE_NAME = "csrftoken"  # Explicit CSRF cookie name

# For production with HTTPS, use:
# CSRF_COOKIE_SECURE = True
# CSRF_COOKIE_SAMESITE = "None"

CSRF_USE_SESSIONS = False  # Use cookie-based CSRF tokens (not session-based)
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="https://api.bandbooster.uz",
).split(",")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        # "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
}

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),  # Access token valid for 24 hours
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Refresh token valid for 7 days
    "ROTATE_REFRESH_TOKENS": True,  # Generate new refresh token on refresh
    "BLACKLIST_AFTER_ROTATION": True,  # Blacklist old refresh tokens
    "UPDATE_LAST_LOGIN": True,  # Update last_login field on authentication
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",  # Print emails to console in dev
)
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@cdielts.com")

# Frontend URL for email verification links
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# ============================================================================
# TELEGRAM BOT CONFIGURATION
# ============================================================================
TELEGRAM_BOT_TOKEN = config("TELEGRAM_BOT_TOKEN", default=None)
TELEGRAM_BOT_USERNAME = config("TELEGRAM_BOT_USERNAME", default=None)

# ============================================================================
# GOOGLE OAUTH CONFIGURATION
# ============================================================================
GOOGLE_OAUTH_CLIENT_ID = config("GOOGLE_OAUTH_CLIENT_ID", default=None)

# ============================================================================
# REDIS CACHE CONFIGURATION
# ============================================================================
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",  # Use database 1 for caching
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "mockexam_cache",
        "TIMEOUT": 300,  # Default timeout: 5 minutes
    },
    "dashboard": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/2",  # Use database 2 for dashboard cache
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "dashboard",
        "TIMEOUT": 900,  # Dashboard cache: 15 minutes
    },
}

# Cache key versioning
CACHE_MIDDLEWARE_KEY_PREFIX = "mockexam"
CACHE_MIDDLEWARE_SECONDS = 600  # 10 minutes

# ============================================================================
# CELERY CONFIGURATION
# ============================================================================
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config(
    "CELERY_RESULT_BACKEND", default="redis://localhost:6379/0"
)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# ============================================================================
# OPENAI CONFIGURATION
# ============================================================================
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OPENAI_MODEL = config("OPENAI_MODEL", default="gpt-4o")  # Use GPT-4o or gpt-4o-mini
OPENAI_ORGANIZATION_ID = config(
    "OPENAI_ORGANIZATION_ID", default=""
)  # Optional organization ID
