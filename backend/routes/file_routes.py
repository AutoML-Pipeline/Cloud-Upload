# FastAPI route definitions for file-related endpoints
from fastapi import APIRouter, UploadFile, File, Form, Request, Query, Body
from controllers import file_controller
from models.pydantic_models import UploadFromURLRequest, UploadFromGoogleDriveRequest
from services import minio_service, gdrive_service
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()

@router.post("/files/upload")
async def upload_file_route(file: UploadFile = File(...), new_filename: str = Form(None), access_token: str = Form(None)):
    return await file_controller.upload_file(file, new_filename, access_token)

@router.post("/files/upload-url")
async def upload_from_url_route(request: UploadFromURLRequest, access_token: str = Form(None)):
    return await file_controller.upload_from_url(request, access_token)

@router.post("/upload-from-google-drive")
async def upload_from_google_drive_route(request: UploadFromGoogleDriveRequest):
    return await gdrive_service.upload_from_gdrive(request)

@router.get("/files/list")
async def list_files_route(folder: str = Query(None)):
    result = minio_service.list_files(folder)
    if "error" in result:
        return JSONResponse(content=result, status_code=500)
    return result

@router.get("/files/download/{filename}")
async def download_file_route(filename: str):
    result = minio_service.download_cleaned_file(filename)
    if "error" in result:
        return JSONResponse(content=result, status_code=500)
    return StreamingResponse(result["file_bytes"], media_type=result["media_type"], headers=result["headers"])

@router.get("/gdrive/list-files")
async def gdrive_list_files_route(access_token: str = Query(...), folder_id: str = Query("root")):
    return gdrive_service.gdrive_list_files(access_token, folder_id)
