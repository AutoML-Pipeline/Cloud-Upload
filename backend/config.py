# Centralized configuration for environment variables and client setup
import os
from dotenv import load_dotenv
from minio import Minio
try:
    import motor.motor_asyncio  # Optional: used only for auth routes
    _MOTOR_AVAILABLE = True
except Exception:
    motor = None
    _MOTOR_AVAILABLE = False
import logging

load_dotenv()

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "uploads")
# Bucket used for cleaned data artifacts
CLEANED_BUCKET = os.getenv("CLEANED_BUCKET", "cleaned-data")

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Ensure default bucket exists at startup to avoid NoSuchBucket errors
def ensure_minio_bucket_exists() -> None:
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
            logging.info(f"Created MinIO bucket '{MINIO_BUCKET}'.")
    except Exception as exc:
        logging.error(f"Failed to ensure MinIO bucket '{MINIO_BUCKET}': {exc}")

# Run on import
ensure_minio_bucket_exists()

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
if _MOTOR_AVAILABLE:
    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = mongo_client["cloud_upload"]
    users_collection = db["users"]
else:
    mongo_client = None
    db = None
    users_collection = None
