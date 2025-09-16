from config import minio_client, MINIO_BUCKET, ensure_minio_bucket_exists
import io
import os
import logging
import pandas as pd
import tempfile

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
            ensure_minio_bucket_exists()
            objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
            
        files = []
        for obj in objects:
            if not obj.is_dir:
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
        if not minio_client.bucket_exists(output_bucket):
            minio_client.make_bucket(output_bucket)
        minio_client.fput_object(
            output_bucket,
            cleaned_filename,
            temp_cleaned_path,
            content_type="application/octet-stream"
        )
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
