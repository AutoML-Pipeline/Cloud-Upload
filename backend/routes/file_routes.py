# FastAPI route definitions for file-related endpoints
from fastapi import APIRouter, UploadFile, File, Form, Request, Query, Body
from backend.controllers import file_controller, data_controller
from backend.models.pydantic_models import UploadFromURLRequest, UploadFromGoogleDriveRequest, SQLConnectRequest, SQLWorkbenchRequest
from backend.services import minio_service, gdrive_service, sql_service
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

# Compatibility aliases (no-prefix) for SQL workbench endpoints
@router.post("/sql-list-databases")
async def sql_list_databases_compat(request_body: SQLConnectRequest):
    return await sql_service.sql_list_databases(request_body)

@router.post("/sql-preview")
async def sql_preview_compat(request_body: SQLWorkbenchRequest):
    return await sql_service.sql_preview(request_body)

@router.post("/upload-from-sql")
async def upload_from_sql_compat(request_body: SQLWorkbenchRequest):
    return await sql_service.upload_from_sql(request_body)

# Compatibility alias for data preview without /api prefix
@router.get("/data/preview/{filename}")
async def data_preview_compat(filename: str):
    return data_controller.get_data_preview(filename)
