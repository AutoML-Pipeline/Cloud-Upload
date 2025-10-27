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
# Bucket for feature-engineered data
FEATURE_ENGINEERED_BUCKET = os.getenv("FEATURE_ENGINEERED_BUCKET", "feature-engineered")
# Buckets for model training
MODELS_BUCKET = os.getenv("MODELS_BUCKET", "models")
TRAINING_RESULTS_BUCKET = os.getenv("TRAINING_RESULTS_BUCKET", "training-results")

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Ensure default buckets exist at startup to avoid NoSuchBucket errors
def ensure_minio_buckets_exist() -> None:
    """Create all required MinIO buckets if they don't exist"""
    buckets = [
        MINIO_BUCKET,
        CLEANED_BUCKET,
        FEATURE_ENGINEERED_BUCKET,
        MODELS_BUCKET,
        TRAINING_RESULTS_BUCKET,
    ]
    for bucket in buckets:
        try:
            if not minio_client.bucket_exists(bucket):
                minio_client.make_bucket(bucket)
                logging.info(f"✅ Created MinIO bucket '{bucket}'.")
        except Exception as exc:
            logging.error(f"❌ Failed to ensure MinIO bucket '{bucket}': {exc}")

# Run on import
ensure_minio_buckets_exist()

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
