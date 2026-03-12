from __future__ import annotations

from io import BytesIO

import boto3

from app.core.config import get_settings

settings = get_settings()

s3_client = boto3.client(
    "s3",
    endpoint_url=settings.minio_endpoint,
    aws_access_key_id=settings.minio_root_user,
    aws_secret_access_key=settings.minio_root_password,
)


def read_object(object_key: str) -> bytes:
    response = s3_client.get_object(Bucket=settings.minio_bucket, Key=object_key)
    return response["Body"].read()


def open_object_stream(object_key: str) -> BytesIO:
    return BytesIO(read_object(object_key))
