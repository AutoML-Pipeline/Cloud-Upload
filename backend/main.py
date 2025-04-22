import os
from fastapi import FastAPI, File, UploadFile, Request, status, Header, Body, Form
from starlette.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv
import requests
from typing import Optional
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import json
from fastapi.responses import HTMLResponse, JSONResponse
import motor.motor_asyncio
from bson import ObjectId
import warnings
import certifi
from fastapi.security import OAuth2AuthorizationCodeBearer
import urllib.parse
import pymysql
import tempfile
import csv
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

load_dotenv()

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "uploads")

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Ensure the bucket exists
found = minio_client.bucket_exists(MINIO_BUCKET)
if not found:
    minio_client.make_bucket(MINIO_BUCKET)

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client["cloud_upload"]
users_collection = db["users"]

# Helper to upsert user
async def upsert_google_user(google_id, email, name, picture=None):
    user_doc = {
        "google_id": google_id,
        "email": email,
        "name": name,
        "picture": picture,
    }
    await users_collection.update_one(
        {"google_id": google_id},
        {"$set": user_doc},
        upsert=True
    )
    return user_doc

class UploadFromURLRequest(BaseModel):
    url: str
    filename: Optional[str] = None

class UploadFromGoogleDriveRequest(BaseModel):
    file_id: str
    access_token: str
    filename: Optional[str] = None

class SQLWorkbenchRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str
    query: str

class SQLConnectRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str

# Google OAuth config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# Use the most compatible Google OAuth scopes
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.readonly"
]

# Load OAuth config from file
with open("google_oauth_config.json") as f:
    GOOGLE_OAUTH_CONFIG = json.load(f)

# OneDrive OAuth2 config
ONEDRIVE_CLIENT_ID = os.getenv("ONEDRIVE_CLIENT_ID", "your_onedrive_client_id")
ONEDRIVE_CLIENT_SECRET = os.getenv("ONEDRIVE_CLIENT_SECRET", "your_onedrive_client_secret")
ONEDRIVE_REDIRECT_URI = os.getenv("ONEDRIVE_REDIRECT_URI", "http://localhost:8000/auth/onedrive/callback")
ONEDRIVE_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
ONEDRIVE_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

# Box OAuth2 config
BOX_CLIENT_ID = os.getenv("BOX_CLIENT_ID", "your_box_client_id")
BOX_CLIENT_SECRET = os.getenv("BOX_CLIENT_SECRET", "your_box_client_secret")
BOX_REDIRECT_URI = os.getenv("BOX_REDIRECT_URI", "http://localhost:8000/auth/box/callback")
BOX_AUTH_URL = "https://account.box.com/api/oauth2/authorize"
BOX_TOKEN_URL = "https://api.box.com/oauth2/token"

# Amazon S3 does not use OAuth, but can use access keys or pre-signed URLs.

@app.get("/auth/google/login")
def google_login():
    flow = Flow.from_client_config(
        GOOGLE_OAUTH_CONFIG,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    # In production, store state in session for CSRF protection
    return RedirectResponse(auth_url)

@app.get("/auth/google/callback")
async def google_callback(code: str, request: Request):
    try:
        flow = Flow.from_client_config(
            GOOGLE_OAUTH_CONFIG,
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)
        creds = flow.credentials
        print("Access token:", creds.token)  # Debug print
        # Get user info from Google
        from googleapiclient.discovery import build
        oauth2_service = build('oauth2', 'v2', credentials=creds)
        user_info = oauth2_service.userinfo().get().execute()

        # Prepare credentials dict for frontend (includes refresh_token if available)
        creds_dict = {
            'access_token': creds.token,
            'refresh_token': getattr(creds, 'refresh_token', None),
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes,
            'email': user_info['email'],
            'name': user_info.get('name', '')
        }

        # Dynamically detect the opener's origin from the request referer
        referer = request.headers.get('referer')
        target_origin = 'http://localhost:5173'
        if referer:
            import re
            match = re.match(r'(https?://[^/]+)', referer)
            if match:
                target_origin = match.group(1)

        html_content = f"""<html>
  <body>
    <script>
      try {{
        window.opener.postMessage({{
          google_creds: {json.dumps(creds_dict)}
        }}, '{target_origin}');
        window.close();
      }} catch (e) {{
        document.body.innerHTML += '<div style="color:red">Failed to send token to opener: ' + e + '</div>';
      }}
    </script>
  </body>
</html>
"""
        return HTMLResponse(content=html_content)
    except Exception as e:
        import traceback
        print("Google OAuth callback error:", traceback.format_exc())
        html_content = f"""<html><body><h3>Google OAuth failed: {str(e)}</h3></body></html>
"""
        return HTMLResponse(content=html_content)

@app.get("/auth/onedrive/login")
def onedrive_login():
    params = {
        "client_id": ONEDRIVE_CLIENT_ID,
        "scope": "files.read offline_access",
        "response_type": "code",
        "redirect_uri": ONEDRIVE_REDIRECT_URI,
        "response_mode": "query",
    }
    url = f"{ONEDRIVE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@app.get("/auth/onedrive/callback")
def onedrive_callback(code: str):
    return {"message": "OneDrive callback received. Exchange code for token and fetch files here."}

@app.get("/auth/box/login")
def box_login():
    params = {
        "client_id": BOX_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": BOX_REDIRECT_URI,
    }
    url = f"{BOX_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@app.get("/auth/box/callback")
def box_callback(code: str):
    return {"message": "Box callback received. Exchange code for token and fetch files here."}

@app.post("/upload-from-url")
async def upload_from_url(request: UploadFromURLRequest, access_token: str = Header(None)):
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
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                from googleapiclient.http import MediaIoBaseDownload
                creds = Credentials(token=access_token, client_id=GOOGLE_CLIENT_ID, client_secret=GOOGLE_CLIENT_SECRET, token_uri="https://oauth2.googleapis.com/token")
                drive_service = build('drive', 'v3', credentials=creds)
                file_metadata = drive_service.files().get(fileId=file_id).execute()
                filename = filename or file_metadata['name']
                request_media = drive_service.files().get_media(fileId=file_id)
                import io
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
                    length=len(fh.getvalue()),
                )
                return {"message": f"{filename} uploaded from Google Drive successfully."}
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Google Drive download failed: {str(e)}"})
        # Advanced: Try HTTP range-request batch download for large files
        import tempfile, os
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        # Check if server supports range requests
        supports_range = False
        try:
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
            return JSONResponse(status_code=resp.status_code if hasattr(resp, 'status_code') else 400, content={"error": f"HTTP error: {str(e)}"})
        if not filename:
            filename = url.split("/")[-1].split("?")[0] or "uploaded_file"
        file_size = resp.headers.get('content-length')
        try:
            file_size = int(file_size) if file_size is not None and str(file_size).isdigit() else None
        except Exception:
            file_size = None
        if file_size is None:
            try:
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    for chunk in resp.iter_content(chunk_size=8192):
                        if chunk:
                            tmp.write(chunk)
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
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Upload to MinIO (chunked) failed: {str(e)}"})
        else:
            try:
                minio_client.put_object(
                    MINIO_BUCKET,
                    filename,
                    data=resp.raw,
                    length=file_size,
                )
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": f"Upload to MinIO failed: {str(e)}"})
        return {"message": f"{filename} uploaded from URL successfully."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Unexpected error: {str(e)}"})

@app.post("/upload-from-google-drive")
async def upload_from_gdrive(request: UploadFromGoogleDriveRequest):
    try:
        creds = Credentials(token=request.access_token, client_id=GOOGLE_CLIENT_ID, client_secret=GOOGLE_CLIENT_SECRET, token_uri="https://oauth2.googleapis.com/token")
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = drive_service.files().get(fileId=request.file_id).execute()
        filename = request.filename or file_metadata['name']
        request_media = drive_service.files().get_media(fileId=request.file_id)
        from googleapiclient.http import MediaIoBaseDownload
        import io
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
            length=len(fh.getvalue()),
        )
        return {"message": f"{filename} uploaded from Google Drive successfully."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Google Drive download failed: {str(e)}"})

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        import os
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        minio_client.put_object(
            MINIO_BUCKET,
            file.filename,
            data=file.file,
            length=file_size,
        )
        return {"message": f"{file.filename} uploaded successfully."}
    except S3Error as e:
        return JSONResponse(status_code=500, content={"error": f"MinIO error: {str(e)}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Unexpected error: {str(e)}"})

# Google Drive: List files in a folder
@app.get("/gdrive/list-files")
def gdrive_list_files(access_token: str, folder_id: str = "root"):
    try:
        creds = Credentials(token=access_token, client_id=GOOGLE_CLIENT_ID, client_secret=GOOGLE_CLIENT_SECRET, token_uri="https://oauth2.googleapis.com/token")
        drive_service = build('drive', 'v3', credentials=creds)
        # List files in the specified folder
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

@app.get("/list_uploaded_files")
def list_uploaded_files():
    try:
        objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
        files = [obj.object_name for obj in objects if not obj.is_dir]
        return {"files": files}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/sql-preview")
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

@app.post("/upload-from-sql")
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
        # Write to Parquet
        df = pd.DataFrame(rows, columns=columns)
        table = pa.Table.from_pandas(df)
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmpfile:
            pq.write_table(table, tmpfile.name)
            tmpfile_path = tmpfile.name
        filename = f"sql_upload_{os.path.basename(tmpfile_path)}"
        minio_client.fput_object(
            MINIO_BUCKET,
            filename,
            tmpfile_path,
        )
        os.remove(tmpfile_path)
        return {"message": f"Data uploaded to MinIO as {filename} (parquet format)"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/sql-list-databases")
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

@app.post("/data_preprocessing")
async def data_preprocessing(
    filename: str = Form(...),
    steps: list[str] = Form([])
):
    import io
    import os
    import tempfile
    # Download original file from MinIO
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        file_bytes = io.BytesIO(response.read())
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading file from MinIO: {e}"}, status_code=500)

    # Load into DataFrame
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_bytes)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes)
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes)
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(file_bytes)
        else:
            return JSONResponse(content={"error": "Unsupported file format."}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Error loading file into DataFrame: {e}"}, status_code=500)

    # Preprocessing
    try:
        if 'drop_nulls' in steps:
            df.dropna(inplace=True)
        if 'fill_nulls' in steps:
            df.fillna(0, inplace=True)
        if 'remove_duplicates' in steps:
            df.drop_duplicates(inplace=True)
    except Exception as e:
        return JSONResponse(content={"error": f"Error during preprocessing: {e}"}, status_code=500)

    # Save as Parquet and upload
    output_bucket = "cleaned-data"
    cleaned_filename = f"cleaned_{os.path.splitext(filename)[0]}.parquet"

    if not minio_client.bucket_exists(output_bucket):
        minio_client.make_bucket(output_bucket)

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            for col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col])
                except:
                    df[col] = df[col].astype(str)
            df.to_parquet(tmp_file.name, engine='pyarrow')
            tmp_file.seek(0)
            minio_client.put_object(
                output_bucket,
                cleaned_filename,
                io.BytesIO(tmp_file.read()),
                length=os.path.getsize(tmp_file.name),
                content_type="application/octet-stream"
            )
    except Exception as e:
        return JSONResponse(content={"error": f"Error uploading Parquet to MinIO: {e}"}, status_code=500)

    # Reload cleaned file
    try:
        response = minio_client.get_object(output_bucket, cleaned_filename)
        cleaned_df = pd.read_parquet(io.BytesIO(response.read()), engine='pyarrow')
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading cleaned Parquet from MinIO: {e}"}, status_code=500)

    # Replace NaN/inf values with None before JSON serialization
    preview = cleaned_df.head(10).replace([float('nan'), float('inf'), float('-inf')], None).where(pd.notnull(cleaned_df.head(10)), None).to_dict(orient='records')
    dtypes_table = [{"column": col, "dtype": str(dtype)} for col, dtype in cleaned_df.dtypes.items()]
    nulls_table = [{"column": col, "null_count": int(nulls) if pd.notnull(nulls) and not pd.isna(nulls) else 0} for col, nulls in cleaned_df.isnull().sum().items()]

    return {"preview": preview, "dtypes_table": dtypes_table, "nulls_table": nulls_table, "cleaned_filename": cleaned_filename}
