from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings


class MediaStorage(S3Boto3Storage):
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    location = settings.AWS_MEDIA_LOCATION
    default_acl = settings.AWS_DEFAULT_ACL
    file_overwrite = settings.AWS_S3_FILE_OVERWRITE
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    querystring_auth = settings.AWS_QUERYSTRING_AUTH
    object_parameters = settings.AWS_S3_OBJECT_PARAMETERS

    access_key = settings.AWS_ACCESS_KEY_ID
    secret_key = settings.AWS_SECRET_ACCESS_KEY
    region_name = settings.AWS_S3_REGION_NAME
    endpoint_url = settings.AWS_S3_ENDPOINT_URL
