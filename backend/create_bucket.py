from minio import Minio
import os

# MinIO configuration
MINIO_ENDPOINT = "127.0.0.1:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "uploads"

# Create MinIO client
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

def create_bucket_if_not_exists():
    try:
        # Check if bucket exists
        if not minio_client.bucket_exists(MINIO_BUCKET):
            # Create the bucket
            minio_client.make_bucket(MINIO_BUCKET)
            print(f"Bucket '{MINIO_BUCKET}' created successfully!")
        else:
            print(f"Bucket '{MINIO_BUCKET}' already exists.")
    except Exception as e:
        print(f"Error creating bucket: {e}")

def create_feature_engineered_bucket():
    try:
        bucket_name = "feature-engineered"
        # Check if bucket exists
        if not minio_client.bucket_exists(bucket_name):
            # Create the bucket
            minio_client.make_bucket(bucket_name)
            print(f"Bucket '{bucket_name}' created successfully!")
        else:
            print(f"Bucket '{bucket_name}' already exists.")
    except Exception as e:
        print(f"Error creating feature-engineered bucket: {e}")

if __name__ == "__main__":
    create_bucket_if_not_exists()
    create_feature_engineered_bucket() 