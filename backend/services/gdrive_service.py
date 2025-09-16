from fastapi.responses import JSONResponse
from models.pydantic_models import UploadFromGoogleDriveRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io
import logging
import re

from services.minio_service import ensure_bucket_exists, upload_object
from config import MINIO_BUCKET

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

async def upload_from_gdrive(request: UploadFromGoogleDriveRequest):
    try:
        creds = Credentials(token=request.access_token)
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = drive_service.files().get(fileId=request.file_id).execute()
        original_filename = file_metadata['name']
        filename_to_use = request.filename if request.filename else original_filename

        if not filename_to_use.lower().endswith('.parquet'):
            filename_to_use += '.parquet'

        request_media = drive_service.files().get_media(fileId=request.file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_media)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        fh.seek(0)

        ensure_bucket_exists(MINIO_BUCKET)

        logging.info(f"Attempting to upload {filename_to_use} to MinIO bucket {MINIO_BUCKET}")
        upload_object(
            MINIO_BUCKET,
            filename_to_use,
            data=fh.getvalue(),
        )
        logging.info(f"Successfully uploaded {filename_to_use} to MinIO.")
        return {"message": f"{filename_to_use} uploaded from Google Drive successfully.", "filename": filename_to_use}
    except Exception as e:
        logging.error(f"Error during Google Drive upload for file ID {request.file_id}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Google Drive download failed: {str(e)}"})
