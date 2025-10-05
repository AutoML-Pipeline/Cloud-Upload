# Handles file upload, download, and MinIO logic
from fastapi import UploadFile, File, Form, Header, APIRouter, Request
from fastapi.responses import JSONResponse
from backend.models.pydantic_models import UploadFromURLRequest, UploadFromGoogleDriveRequest
import requests
import warnings
import logging
import os
import tempfile
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from backend.services import minio_service, gdrive_service
from backend.config import MINIO_BUCKET
from urllib.parse import urlparse


# Helper: convert to Parquet if the requested filename ends with .parquet
def _convert_to_parquet_if_needed(local_path: str, target_filename: str, source_hint: str = None):
    """
    Returns (upload_path, final_name, cleanup)
    - upload_path: path to upload
    - final_name: object name to use
    - cleanup: callable to run after upload (may be None)
    On error, returns (None, None, error_message)
    """
    try:
        want_parquet = target_filename.lower().endswith('.parquet')
        if not want_parquet:
            return local_path, target_filename, None
        # Already parquet? upload as-is with requested .parquet name
        if local_path.lower().endswith('.parquet'):
            return local_path, target_filename, None
        ext = os.path.splitext(source_hint or local_path)[1].lower().lstrip('.')
        df = None
        if ext in ['csv', '']:  # try CSV by default if unknown
            try:
                df = pd.read_csv(local_path)
            except Exception:
                df = None
        if df is None and ext == 'tsv':
            try:
                df = pd.read_csv(local_path, sep='\t')
            except Exception:
                df = None
        if df is None and ext in ['json', 'jsonl', 'ndjson']:
            try:
                df = pd.read_json(local_path, lines=(ext in ['jsonl', 'ndjson']))
            except Exception:
                df = None
        if df is None and ext in ['xls', 'xlsx']:
            try:
                df = pd.read_excel(local_path)
            except Exception:
                df = None
        if df is None:
            return None, None, 'File format not supported for parquet conversion.'
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp:
            pq.write_table(pa.Table.from_pandas(df), tmp.name)
            return tmp.name, target_filename, lambda: os.remove(tmp.name)
    except Exception as e:
        return None, None, f'Failed converting to Parquet: {e}'

# --- FILE UPLOADS ---
async def upload_from_url(request: UploadFromURLRequest, access_token: str = None):
    url = request.url
    filename = request.filename
    try:
        # Handle Hugging Face datasets links
        if url.startswith("hf://") or "huggingface.co/datasets" in url:
            try:
                from huggingface_hub import hf_hub_download, HfApi
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"huggingface_hub is required to fetch datasets: {e}"})

            def _parse_hf(u: str):
                if u.startswith("hf://"):
                    # Formats: hf://datasets/{namespace}/{name}/path/to/file (optional path)
                    rest = u[len("hf://"):].lstrip("/")
                    parts = [p for p in rest.split("/") if p]
                    if not parts or parts[0] != "datasets" or len(parts) < 3:
                        return None, None, None
                    repo_id = f"{parts[1]}/{parts[2]}"
                    file_path = "/".join(parts[3:]) if len(parts) > 3 else None
                    return repo_id, file_path, None
                parsed = urlparse(u)
                segs = [s for s in parsed.path.split("/") if s]
                # Expected: datasets/{ns}/{name}/(resolve|blob)/{rev}/{path...}
                if len(segs) >= 3 and segs[0] == "datasets":
                    repo_id = f"{segs[1]}/{segs[2]}"
                    file_path = None
                    rev = None
                    for marker in ("resolve", "blob"):
                        if marker in segs:
                            idx = segs.index(marker)
                            if len(segs) >= idx + 3:
                                rev = segs[idx + 1]
                                file_path = "/".join(segs[idx + 2 :])
                            break
                    return repo_id, file_path, rev
                return None, None, None

            repo_id, file_path, rev = _parse_hf(url)
            if not repo_id:
                return JSONResponse(status_code=400, content={"error": "Invalid Hugging Face dataset URL. Expected formats: 'hf://datasets/<namespace>/<name>/<file>' or 'https://huggingface.co/datasets/<namespace>/<name>/resolve/<rev>/<file>'"})

            api = HfApi()
            if not file_path:
                # Try to discover a suitable data file
                try:
                    files = api.list_repo_files(repo_id=repo_id, repo_type="dataset", revision=rev or "main")
                except Exception as e:
                    return JSONResponse(status_code=400, content={"error": f"Failed to list files for {repo_id}: {e}"})
                candidates = [f for f in files if f.lower().endswith((".parquet", ".csv", ".tsv", ".json", ".jsonl", ".ndjson"))]
                if not candidates:
                    return JSONResponse(status_code=400, content={"error": "No downloadable data file (.parquet/.csv/.tsv/.json) found in this dataset repo. Provide a direct file link."})
                file_path = candidates[0]

            try:
                local_path = hf_hub_download(repo_id=repo_id, filename=file_path, repo_type="dataset", revision=rev or "main")
            except Exception as e:
                return JSONResponse(status_code=502, content={"error": f"Failed to download from Hugging Face: {e}"})

            # Convert to parquet if requested
            upload_path, final_name, cleanup = _convert_to_parquet_if_needed(local_path, filename, source_hint=file_path)
            if upload_path is None:
                return JSONResponse(status_code=400, content={"error": cleanup})
            try:
                minio_service.upload_object(MINIO_BUCKET, final_name, upload_path, length=os.path.getsize(upload_path))
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Failed to upload to MinIO: {e}"})
            finally:
                if callable(cleanup):
                    try:
                        cleanup()
                    except Exception:
                        pass
            return {"message": f"{final_name} uploaded from Hugging Face successfully.", "filename": final_name}

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
            
            gdrive_request = UploadFromGoogleDriveRequest(file_id=file_id, access_token=access_token, filename=filename)
            return await gdrive_service.upload_from_gdrive(gdrive_request)
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
            # Convert if requested
            upload_path, final_name, cleanup = _convert_to_parquet_if_needed(tmp_path, filename, source_hint=url)
            if upload_path is None:
                # If conversion failed and filename is not parquet, upload original
                if not filename.lower().endswith('.parquet'):
                    upload_path, final_name, cleanup = (tmp_path, filename, None)
                else:
                    os.remove(tmp_path)
                    return JSONResponse(status_code=400, content={"error": cleanup})
            try:
                minio_service.upload_object(
                    MINIO_BUCKET,
                    final_name,
                    upload_path,
                    length=os.path.getsize(upload_path)
                )
            finally:
                if callable(cleanup):
                    try:
                        cleanup()
                    except Exception:
                        pass
                os.remove(tmp_path)
            return {"message": f"{final_name} uploaded from URL using batch download successfully.", "filename": final_name}
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
            # Convert if requested
            upload_path, final_name, cleanup = _convert_to_parquet_if_needed(tmp_path, filename, source_hint=url)
            if upload_path is None:
                if not filename.lower().endswith('.parquet'):
                    upload_path, final_name, cleanup = (tmp_path, filename, None)
                else:
                    raise RuntimeError(cleanup)
            minio_service.upload_object(
                MINIO_BUCKET,
                final_name,
                upload_path,
                length=os.path.getsize(upload_path)
            )
        finally:
            if callable(cleanup):
                try:
                    cleanup()
                except Exception:
                    pass
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        return {"message": f"{final_name} uploaded from URL successfully.", "filename": final_name}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Unexpected error: {str(e)}"})

async def upload_file(file: UploadFile = File(...), new_filename: str = Form(None), access_token: str = Form(None)):
    try:
        minio_service.ensure_bucket_exists(MINIO_BUCKET)

        original_file_ext = file.filename.split('.')[-1].lower()

        df = None

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

        base_filename = os.path.splitext(new_filename if new_filename else file.filename)[0]
        parquet_filename = f"{base_filename}.parquet"

        table = pa.Table.from_pandas(df)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmpfile:
            pq.write_table(table, tmpfile.name)
            logging.info(f"Attempting to upload {parquet_filename} from {tmpfile.name} to MinIO bucket {MINIO_BUCKET}")
            minio_service.upload_object(
                MINIO_BUCKET,
                parquet_filename,
                tmpfile.name,
                length=os.path.getsize(tmpfile.name)
            )
            logging.info(f"Successfully uploaded {parquet_filename} to MinIO.")
        os.remove(tmpfile.name)
        return {"message": f"File converted and uploaded as {parquet_filename}", "filename": parquet_filename}
    except Exception as e:
        logging.error(f"Error during upload/conversion for {file.filename}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Error during upload/conversion: {str(e)}"})