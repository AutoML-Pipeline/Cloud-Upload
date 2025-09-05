from minio import Minio
from config import minio_client, MINIO_BUCKET

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

if __name__ == "__main__":
    create_bucket_if_not_exists() 