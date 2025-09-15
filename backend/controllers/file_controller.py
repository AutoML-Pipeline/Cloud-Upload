# Handles file upload, download, and MinIO logic
from fastapi import UploadFile, File, Form, Header, APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from config import minio_client, MINIO_BUCKET
from models.pydantic_models import UploadFromURLRequest, UploadFromGoogleDriveRequest, SQLWorkbenchRequest
import io
import os
import requests
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import tempfile
import pymysql
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from fastapi import Response
import warnings
import logging
from config import ensure_minio_bucket_exists # Import the bucket existence check
from models.pydantic_models import SQLConnectRequest

# --- FILE UPLOADS ---
async def upload_from_url(request: UploadFromURLRequest, access_token: str = None):
    url = request.url
    filename = request.filename
    try:
        # Handle Google Drive
        if "drive.google.com" in url:
            import re
            match = re.search(r"/d/([\w-]+)", url)
            if not match:
                match = re.search(r"id=([\w-]+)", url)
            if not match:
                return JSONResponse(status_code=400, content={"error": "Could not extract file ID from Google Drive URL."})
            file_id = match.group(1)
            if not access_token:
                return JSONResponse(status_code=401, content={"error": "Google access token required for Drive download. Please log in with Google."})
            try:
                creds = Credentials(token=access_token)
                drive_service = build('drive', 'v3', credentials=creds)
                file_metadata = drive_service.files().get(fileId=file_id).execute()
                filename = filename or file_metadata['name']
                request_media = drive_service.files().get_media(fileId=file_id)
                fh = io.BytesIO()
                downloader = MediaIoBaseDownload(fh, request_media)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                fh.seek(0)
                minio_client.put_object(
                    MINIO_BUCKET,
                    filename,
                    data=fh,
                )
                return {"message": f"{filename} uploaded from Google Drive successfully."}
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Google Drive download failed: {str(e)}"})
        # Advanced: Try HTTP range-request batch download for large files
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        supports_range = False
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)
                head_resp = requests.head(url, headers=headers, verify=False, timeout=30)
            supports_range = head_resp.headers.get('Accept-Ranges', '').lower() == 'bytes'
            file_size = int(head_resp.headers.get('content-length', 0))
        except Exception:
            file_size = None
        if supports_range and file_size and file_size > 0:
            chunk_size = 10 * 1024 * 1024  # 10MB
            num_chunks = (file_size + chunk_size - 1) // chunk_size
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                for i in range(num_chunks):
                    start = i * chunk_size
                    end = min(start + chunk_size - 1, file_size - 1)
                    range_header = {'Range': f'bytes={start}-{end}'}
                    range_header.update(headers)
                    for attempt in range(3):
                        try:
                            with warnings.catch_warnings():
                                warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)
                                chunk_resp = requests.get(url, headers=range_header, stream=True, verify=False, timeout=1800)
                            chunk_resp.raise_for_status()
                            for chunk in chunk_resp.iter_content(chunk_size=8192):
                                if chunk:
                                    tmp.write(chunk)
                            break
                        except Exception as e:
                            if attempt == 2:
                                return JSONResponse(status_code=500, content={"error": f"Failed to download chunk {i+1}/{num_chunks}: {str(e)}"})
                tmp.flush()
                tmp_path = tmp.name
            try:
                minio_client.fput_object(
                    MINIO_BUCKET,
                    filename,
                    tmp_path,
                )
            finally:
                os.remove(tmp_path)
            return {"message": f"{filename} uploaded from URL using batch download successfully."}
        # Fallback: normal download
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)
                resp = requests.get(url, stream=True, verify=False, timeout=1800, headers=headers)
        except requests.exceptions.SSLError as ssl_err:
            return JSONResponse(status_code=502, content={"error": f"SSL error: {str(ssl_err)}. Try a different link or update your certificates."})
        except requests.exceptions.ConnectionError as conn_err:
            return JSONResponse(status_code=502, content={"error": f"Connection error: {str(conn_err)}. The remote server may be down or blocking requests."})
        except requests.exceptions.Timeout:
            return JSONResponse(status_code=504, content={"error": "Download timed out. The file is too large or the server is too slow."})
        except requests.exceptions.RequestException as req_err:
            return JSONResponse(status_code=400, content={"error": f"Failed to download file: {str(req_err)}"})
        try:
            resp.raise_for_status()
        except Exception as e:
            return JSONResponse(status_code=resp.status_code if hasattr(resp, 'status_code') else 500, content={"error": f"Failed to download file: {str(e)}"})
        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        tmp.write(chunk)
                tmp.flush()
                tmp_path = tmp.name
            minio_client.fput_object(
                MINIO_BUCKET,
                filename,
                tmp_path,
            )
        finally:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        return {"message": f"{filename} uploaded from URL successfully."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Unexpected error: {str(e)}"})

async def upload_from_gdrive(request: UploadFromGoogleDriveRequest):
    try:
        creds = Credentials(token=request.access_token)
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = drive_service.files().get(fileId=request.file_id).execute()
        original_filename = file_metadata['name']
        filename_to_use = request.filename if request.filename else original_filename

        # Ensure the filename has a .parquet extension
        if not filename_to_use.lower().endswith('.parquet'):
            filename_to_use += '.parquet'

        request_media = drive_service.files().get_media(fileId=request.file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_media)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        fh.seek(0)

        # Ensure the bucket exists before attempting to upload
        ensure_minio_bucket_exists()

        logging.info(f"Attempting to upload {filename_to_use} to MinIO bucket {MINIO_BUCKET}")
        minio_client.put_object(
            MINIO_BUCKET,
            filename_to_use,
            data=fh,
        )
        logging.info(f"Successfully uploaded {filename_to_use} to MinIO.")
        return {"message": f"{filename_to_use} uploaded from Google Drive successfully."}
    except Exception as e:
        logging.error(f"Error during Google Drive upload for file ID {request.file_id}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Google Drive download failed: {str(e)}"})

async def upload_file(file: UploadFile = File(...), new_filename: str = Form(None), access_token: str = Form(None)):
    try:
        # Ensure the bucket exists before attempting to upload
        ensure_minio_bucket_exists()

        # Determine the original file extension for format validation
        original_file_ext = file.filename.split('.')[-1].lower()

        df = None # Initialize df to None

        # Read file into DataFrame based on original file extension
        if original_file_ext == 'csv':
            df = pd.read_csv(file.file)
        elif original_file_ext in ['xls', 'xlsx']:
            df = pd.read_excel(file.file)
        elif original_file_ext == 'json':
            df = pd.read_json(file.file)
        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported file format for conversion. Only CSV, Excel, JSON supported."})

        if df is None:
            return JSONResponse(status_code=500, content={"error": "Failed to read file into DataFrame."})

        # Determine the filename to use for saving (either new_filename or original base name + .parquet)
        base_filename = os.path.splitext(new_filename if new_filename else file.filename)[0]
        parquet_filename = f"{base_filename}.parquet"

        # Save as Parquet
        table = pa.Table.from_pandas(df)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmpfile:
            pq.write_table(table, tmpfile.name)
            logging.info(f"Attempting to upload {parquet_filename} from {tmpfile.name} to MinIO bucket {MINIO_BUCKET}")
            minio_client.fput_object(
                MINIO_BUCKET,
                parquet_filename,
                tmpfile.name,
            )
            logging.info(f"Successfully uploaded {parquet_filename} to MinIO.")
        os.remove(tmpfile.name)
        return {"message": f"File converted and uploaded as {parquet_filename}", "filename": parquet_filename}
    except Exception as e:
        logging.error(f"Error during upload/conversion for {file.filename}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Error during upload/conversion: {str(e)}"})

def gdrive_list_files(access_token: str, folder_id: str = "root"):
    try:
        creds = Credentials(token=access_token)
        drive_service = build('drive', 'v3', credentials=creds)
        query = f"'{folder_id}' in parents and trashed=false"
        files = []
        page_token = None
        while True:
            response = drive_service.files().list(
                q=query,
                spaces='drive',
                fields='nextPageToken, files(id, name, mimeType)',
                pageToken=page_token
            ).execute()
            files.extend(response.get('files', []))
            page_token = response.get('nextPageToken', None)
            if page_token is None:
                break
        return {"files": files}
    except Exception as e:
        return {"error": f"Failed to list Google Drive files: {str(e)}"}

# --- SQL/DB ---
async def sql_preview(request: SQLWorkbenchRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password,
            database=request.database
        )
        with conn.cursor() as cursor:
            cursor.execute(request.query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(20)
        conn.close()
        preview = [dict(zip(columns, row)) for row in rows]
        return {"preview": preview}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

async def upload_from_sql(request: SQLWorkbenchRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password,
            database=request.database
        )
        with conn.cursor() as cursor:
            cursor.execute(request.query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
        conn.close()
        df = pd.DataFrame(rows, columns=columns)
        table = pa.Table.from_pandas(df)

        # Ensure the bucket exists before attempting to upload
        ensure_minio_bucket_exists()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmpfile:
            pq.write_table(table, tmpfile.name)
            tmpfile_path = tmpfile.name
        
        filename_to_use = request.filename if request.filename else f"sql_upload_{os.path.basename(tmpfile_path)}.parquet"

        # Ensure the filename has a .parquet extension
        if not filename_to_use.lower().endswith('.parquet'):
            filename_to_use += '.parquet'

        logging.info(f"Attempting to upload {filename_to_use} from {tmpfile_path} to MinIO bucket {MINIO_BUCKET}")
        minio_client.fput_object(
            MINIO_BUCKET,
            filename_to_use,
            tmpfile_path,
        )
        logging.info(f"Successfully uploaded {filename_to_use} to MinIO.")
        os.remove(tmpfile_path)
        return {"message": f"Data uploaded to MinIO as {filename_to_use}"}
    except Exception as e:
        logging.error(f"Error during SQL upload: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Error during SQL upload: {str(e)}"})

async def sql_list_databases(request: SQLConnectRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES")
            dbs = [row[0] for row in cursor.fetchall()]
        conn.close()
        return {"databases": dbs}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- MINIO FILES ---
async def list_files():
    try:
        # Guard: ensure bucket exists before listing
        from config import ensure_minio_bucket_exists
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
        return JSONResponse(content={"error": str(e), "trace": traceback.format_exc()}, status_code=500)

from fastapi.responses import JSONResponse

def save_cleaned_to_minio(temp_cleaned_path: str, cleaned_filename: str):
    output_bucket = "cleaned-data"
    try:
        if not os.path.exists(temp_cleaned_path):
            return JSONResponse(content={"error": "Temporary cleaned file not found."}, status_code=404)
        if not minio_client.bucket_exists(output_bucket):
            minio_client.make_bucket(output_bucket)
        # Use fput_object to avoid needing length param across client versions
        minio_client.fput_object(
            output_bucket,
            cleaned_filename,
            temp_cleaned_path,
            content_type="application/octet-stream"
        )
        return JSONResponse(content={"message": f"{cleaned_filename} saved to MinIO bucket {output_bucket}."})
    except Exception as e:
        logging.error(f"Error saving cleaned file to MinIO: {e}")
        return JSONResponse(content={"error": f"Error saving cleaned file to MinIO: {e}"}, status_code=500)

def save_data_to_minio(data: str, filename: str, folder: str = "cleaned-data"):
    """Save CSV data to MinIO as parquet file in specified folder"""
    import io
    import pandas as pd
    import tempfile
    import os
    
    try:
        # Ensure bucket exists
        if not minio_client.bucket_exists(folder):
            minio_client.make_bucket(folder)
        
        # Convert CSV data to DataFrame
        df = pd.read_csv(io.StringIO(data))
        
        # Convert to parquet
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df.to_parquet(tmp_file.name, engine='pyarrow', index=False)
            temp_path = tmp_file.name
        
        # Upload to MinIO using fput_object to avoid length requirements
        minio_client.fput_object(
            folder,
            filename,
            temp_path,
            content_type="application/octet-stream"
        )
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return JSONResponse(content={"message": f"{filename} saved to MinIO bucket {folder}."})
    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        logging.error(f"Error saving data to MinIO: {e}")
        return JSONResponse(content={"error": f"Error saving data to MinIO: {e}"}, status_code=500)

def download_cleaned_file(filename: str):
    import io
    output_bucket = "cleaned-data"
    try:
        response = minio_client.get_object(output_bucket, filename)
        file_bytes = io.BytesIO(response.read())
        file_bytes.seek(0)
        return StreamingResponse(file_bytes, media_type="application/octet-stream", headers={
            "Content-Disposition": f"attachment; filename={filename}"
        })
    except Exception as e:
        return JSONResponse(content={"error": f"Error downloading cleaned file: {e}"}, status_code=500)
