# FastAPI route definitions for data-related endpoints
from fastapi import APIRouter, Request
from controllers import data_controller, file_controller
from models.pydantic_models import UploadFromURLRequest

router = APIRouter()

@router.post("/data/preprocess/{filename}")
async def data_preprocessing(filename: str, request: Request):
    body = await request.json()
    steps = body.get("steps", {})
    preprocessing = body.get("preprocessing", None)
    return await data_controller.data_preprocessing(filename, steps, preprocessing, request)

@router.post("/sql-list-databases")
async def sql_list_databases(request: Request):
    body = await request.json()
    return await file_controller.sql_list_databases(type('obj', (object,), body))

@router.post("/sql-preview")
async def sql_preview(request: Request):
    body = await request.json()
    return await file_controller.sql_preview(type('obj', (object,), body))

@router.post("/upload-from-sql")
async def upload_from_sql(request: Request):
    body = await request.json()
    return await file_controller.upload_from_sql(type('obj', (object,), body))

@router.post("/save_cleaned_to_minio")
async def save_cleaned_to_minio(request: Request):
    body = await request.json()
    # Support both old format (temp file) and new format (data + folder)
    if "data" in body and "filename" in body:
        # New format: data + filename + folder
        data = body.get("data")
        filename = body.get("filename")
        folder = body.get("folder", "cleaned-data")
        return file_controller.save_data_to_minio(data, filename, folder)
    else:
        # Old format: temp file path
        temp_cleaned_path = body.get("temp_cleaned_path")
        cleaned_filename = body.get("cleaned_filename")
        return file_controller.save_cleaned_to_minio(temp_cleaned_path, cleaned_filename)

@router.get("/download_cleaned_file/{filename}")
async def download_cleaned_file(filename: str):
    return file_controller.download_cleaned_file(filename)

@router.post("/files/upload-from-url")
async def upload_from_url(request: UploadFromURLRequest):
    return await file_controller.upload_from_url(request)

@router.get("/data/preview/{filename}")
async def data_preview(filename: str):
    return data_controller.get_data_preview(filename)
