# FastAPI route definitions for data-related endpoints
from fastapi import APIRouter, Request
from controllers import data_controller
from services import minio_service, sql_service
from models.pydantic_models import UploadFromURLRequest, SQLConnectRequest, SQLWorkbenchRequest

router = APIRouter()

@router.post("/data/preprocess/{filename}")
async def data_preprocessing(filename: str, request: Request):
    body = await request.json()
    steps = body.get("steps", {})
    preprocessing = body.get("preprocessing", None)
    return await data_controller.data_preprocessing(filename, steps, preprocessing, request)

@router.post("/sql-list-databases")
async def sql_list_databases_route(request_body: SQLConnectRequest):
    return await sql_service.sql_list_databases(request_body)

@router.post("/sql-preview")
async def sql_preview_route(request_body: SQLWorkbenchRequest):
    return await sql_service.sql_preview(request_body)

@router.post("/upload-from-sql")
async def upload_from_sql_route(request_body: SQLWorkbenchRequest):
    return await sql_service.upload_from_sql(request_body)

@router.post("/save_cleaned_to_minio")
async def save_cleaned_to_minio_route(request: Request):
    body = await request.json()
    if "data" in body and "filename" in body:
        data = body.get("data")
        filename = body.get("filename")
        folder = body.get("folder", "cleaned-data")
        return minio_service.save_data_to_minio(data, filename, folder)
    else:
        temp_cleaned_path = body.get("temp_cleaned_path")
        cleaned_filename = body.get("cleaned_filename")
        return minio_service.save_cleaned_to_minio(temp_cleaned_path, cleaned_filename)

@router.get("/download_cleaned_file/{filename}")
async def download_cleaned_file_route(filename: str):
    return minio_service.download_cleaned_file(filename)

@router.post("/files/upload-from-url")
async def upload_from_url_route(request: UploadFromURLRequest):
    # This route is specifically for direct URL uploads, Google Drive handled elsewhere or within file_controller
    from controllers import file_controller
    return await file_controller.upload_from_url(request)

@router.get("/data/preview/{filename}")
async def data_preview(filename: str):
    return data_controller.get_data_preview(filename)
