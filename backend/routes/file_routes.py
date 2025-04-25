# FastAPI route definitions for file-related endpoints
from fastapi import APIRouter, UploadFile, File, Form, Request, Query, Body
from controllers import file_controller
from models.pydantic_models import UploadFromURLRequest, UploadFromGoogleDriveRequest

router = APIRouter()

@router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), access_token: str = Form(None)):
    return await file_controller.upload_file(file, access_token)

@router.post("/files/upload-url")
async def upload_from_url(request: UploadFromURLRequest, access_token: str = Form(None)):
    return await file_controller.upload_from_url(request, access_token)

@router.post("/upload-from-google-drive")
async def upload_from_google_drive(request: dict = Body(...)):
    from controllers import file_controller
    # Accept dict for compatibility with frontend naming
    file_id = request.get("file_id")
    access_token = request.get("access_token")
    filename = request.get("filename")
    # Call the controller with unpacked values
    return await file_controller.upload_from_gdrive(file_id, access_token, filename)

@router.get("/files/list")
async def list_files():
    return await file_controller.list_files()

@router.get("/files/download/{filename}")
async def download_file(filename: str):
    return await file_controller.download_file(filename)

@router.get("/gdrive/list-files")
def gdrive_list_files(access_token: str = Query(...), folder_id: str = Query("root")):
    from controllers import file_controller
    return file_controller.gdrive_list_files(access_token, folder_id)
