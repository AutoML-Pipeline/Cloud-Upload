from backend.config import minio_client, MINIO_BUCKET
import io
import os
import logging
import pandas as pd
import tempfile
from typing import Optional, Tuple

def ensure_bucket_exists(bucket_name: str):
    if not minio_client.bucket_exists(bucket_name):
        minio_client.make_bucket(bucket_name)

def upload_object(bucket_name: str, object_name: str, data, length: int = None, content_type: str = "application/octet-stream"):
    if isinstance(data, str):
        # data is a file path
        minio_client.fput_object(bucket_name, object_name, data, content_type=content_type)
    elif isinstance(data, (io.BytesIO, bytes)):
        # data is bytes or BytesIO object
        if isinstance(data, bytes):
            data = io.BytesIO(data)
        if length is None:
            length = data.getbuffer().nbytes
        minio_client.put_object(bucket_name, object_name, data, length, content_type)
    else:
        raise TypeError("Data must be a file path (str) or a bytes-like object (bytes, io.BytesIO).")

def list_files(folder: str = None):
    try:
        if folder:
            bucket_name = folder
            if not minio_client.bucket_exists(bucket_name):
                return {"files": []}
            objects = minio_client.list_objects(bucket_name, recursive=True)
        else:
            # Bucket is already ensured to exist in config.py on import
            objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
            
        files = []
        for obj in objects:
            if not obj.is_dir:
                # For root folder listing, only include files that are not in subfolders
                if folder is None and '/' in obj.object_name:
                    continue  # Skip files in subfolders
                files.append({
                    "name": obj.object_name,
                    "lastModified": getattr(obj, 'last_modified', None),
                    "size": getattr(obj, 'size', None)
                })
        return {"files": files}
    except Exception as e:
        import traceback
        print(f"[ERROR] Exception in /files/list: {e}")
        print(traceback.format_exc())
        return {"error": str(e), "trace": traceback.format_exc()}

def save_cleaned_to_minio(temp_cleaned_path: str, cleaned_filename: str):
    output_bucket = "cleaned-data"
    try:
        if not os.path.exists(temp_cleaned_path):
            return {"error": "Temporary cleaned file not found."}
        
        # Verify file contents before uploading
        import pandas as pd
        verify_df = pd.read_parquet(temp_cleaned_path)
        logging.info(f"Uploading cleaned file with {len(verify_df)} rows to MinIO as {cleaned_filename}")
        
        if not minio_client.bucket_exists(output_bucket):
            minio_client.make_bucket(output_bucket)
        minio_client.fput_object(
            output_bucket,
            cleaned_filename,
            temp_cleaned_path,
            content_type="application/octet-stream"
        )
        
        # Verify after upload
        import io
        resp = minio_client.get_object(output_bucket, cleaned_filename)
        data = io.BytesIO(resp.read())
        uploaded_df = pd.read_parquet(data)
        logging.info(f"Verified uploaded file has {len(uploaded_df)} rows")
        resp.close()
        resp.release_conn()
        
        return {"message": f"{cleaned_filename} saved to Minio bucket {output_bucket}."}
    except Exception as e:
        logging.error(f"Error saving cleaned file to Minio: {e}")
        return {"error": f"Error saving cleaned file to Minio: {e}"}

def save_data_to_minio(data: str, filename: str, folder: str = "cleaned-data"):
    try:
        if not minio_client.bucket_exists(folder):
            minio_client.make_bucket(folder)
        df = pd.read_csv(io.StringIO(data))
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df.to_parquet(tmp_file.name, engine='pyarrow', index=False)
            temp_path = tmp_file.name
        minio_client.fput_object(
            folder,
            filename,
            temp_path,
            content_type="application/octet-stream"
        )
        os.unlink(temp_path)
        return {"message": f"{filename} saved to Minio bucket {folder}."}
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        logging.error(f"Error saving data to Minio: {e}")
        return {"error": f"Error saving data to Minio: {e}"}

def save_feature_engineered_temp(temp_path: str, filename: str, bucket: str = "feature-engineered"):
    try:
        if not os.path.exists(temp_path):
            return {"error": "Temporary engineered file not found."}
        
        # Verify file contents before uploading
        import pandas as pd
        verify_df = pd.read_parquet(temp_path)
        logging.info(f"Uploading feature engineered file with {len(verify_df)} rows to MinIO as {filename}")
        
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
        minio_client.fput_object(
            bucket,
            filename,
            temp_path,
            content_type="application/octet-stream",
        )
        
        # Verify after upload
        import io
        resp = minio_client.get_object(bucket, filename)
        data = io.BytesIO(resp.read())
        uploaded_df = pd.read_parquet(data)
        logging.info(f"Verified uploaded engineered file has {len(uploaded_df)} rows")
        resp.close()
        resp.release_conn()
        
        os.unlink(temp_path)
        return {"message": f"{filename} saved to Minio bucket {bucket}."}
    except Exception as e:
        logging.error(f"Error saving engineered file to Minio: {e}")
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                logging.warning("Failed to clean up temp file %s", temp_path)
        return {"error": f"Error saving engineered file to Minio: {e}"}

def download_cleaned_file(filename: str):
    output_bucket = "cleaned-data"
    try:
        response = minio_client.get_object(output_bucket, filename)
        file_bytes = io.BytesIO(response.read())
        file_bytes.seek(0)
        return {"file_bytes": file_bytes, "media_type": "application/octet-stream", "headers": {
            "Content-Disposition": f"attachment; filename={filename}"
        }}
    except Exception as e:
        return {"error": f"Error downloading cleaned file: {e}"}


def _read_dataframe_from_path(path: str) -> pd.DataFrame:
    lower = path.lower()
    if lower.endswith(".parquet"):
        return pd.read_parquet(path, engine="pyarrow")
    if lower.endswith(".csv"):
        return pd.read_csv(path)
    if lower.endswith(".xlsx"):
        return pd.read_excel(path)
    if lower.endswith(".json"):
        return pd.read_json(path)
    raise ValueError("Unsupported file format for download")


def _read_dataframe_from_bytes(data: bytes, filename: str) -> pd.DataFrame:
    lower = filename.lower()
    buffer = io.BytesIO(data)
    if lower.endswith(".parquet"):
        return pd.read_parquet(buffer, engine="pyarrow")
    if lower.endswith(".csv"):
        return pd.read_csv(buffer)
    if lower.endswith(".xlsx"):
        return pd.read_excel(buffer)
    if lower.endswith(".json"):
        buffer.seek(0)
        return pd.read_json(buffer)
    raise ValueError("Unsupported file format for download")


def _load_dataframe_from_source(
    temp_path: Optional[str],
    bucket: str,
    filename: Optional[str],
) -> pd.DataFrame:
    if temp_path and os.path.exists(temp_path):
        return _read_dataframe_from_path(temp_path)

    if filename:
        if not minio_client.bucket_exists(bucket):
            raise FileNotFoundError(f"Bucket '{bucket}' not found")
        response = minio_client.get_object(bucket, filename)
        try:
            data = response.read()
        finally:
            response.close()
            response.release_conn()
        return _read_dataframe_from_bytes(data, filename)

    raise FileNotFoundError("Dataset source not available")


def _derive_csv_filename(source_name: Optional[str], default_name: str) -> str:
    if source_name:
        base = os.path.splitext(os.path.basename(source_name))[0]
        return f"{base}.csv"
    return default_name


def prepare_dataset_csv_bytes(
    temp_path: Optional[str],
    filename: Optional[str],
    bucket: str,
    default_filename: str,
    drop_internal_columns: bool = True,
) -> Tuple[bytes, str]:
    df = _load_dataframe_from_source(temp_path, bucket, filename)
    if drop_internal_columns and "_orig_idx" in df.columns:
        df = df.drop(columns=["_orig_idx"])
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")
    download_name = _derive_csv_filename(filename, default_filename)
    return csv_bytes, download_name
