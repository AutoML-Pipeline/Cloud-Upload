# FastAPI route definitions for data-related endpoints
import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from backend.controllers import data_controller
from backend.services import minio_service, sql_service, progress_tracker
from backend.models.pydantic_models import UploadFromURLRequest, SQLConnectRequest, SQLWorkbenchRequest

router = APIRouter()

@router.post("/preprocess/{filename}")
async def data_preprocessing(filename: str, request: Request, background_tasks: BackgroundTasks, full: bool = False):
    body = await request.json()
    steps = body.get("steps", {})
    preprocessing = body.get("preprocessing")

    job_id = progress_tracker.create_job()
    background_tasks.add_task(
        data_controller.run_preprocessing_job,
        job_id,
        filename,
        steps,
        preprocessing,
        full,
    )
    return {"job_id": job_id}


@router.get("/preprocess/status/{job_id}")
async def data_preprocessing_status(job_id: str):
    job = progress_tracker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

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
        # Always save to cleaned-data bucket for cleaned outputs
        return minio_service.save_data_to_minio(data, filename, "cleaned-data")
    else:
        temp_cleaned_path = body.get("temp_cleaned_path")
        cleaned_filename = body.get("cleaned_filename")
        return minio_service.save_cleaned_to_minio(temp_cleaned_path, cleaned_filename)


@router.post("/download_cleaned_csv")
async def download_cleaned_csv_route(request: Request):
    body = await request.json()
    temp_cleaned_path = body.get("temp_cleaned_path")
    cleaned_filename = body.get("cleaned_filename")

    try:
        csv_bytes, download_name = minio_service.prepare_dataset_csv_bytes(
            temp_path=temp_cleaned_path,
            filename=cleaned_filename,
            bucket="cleaned-data",
            default_filename="cleaned_dataset.csv",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Cleaned dataset is no longer available for download")
    except Exception as exc:  # noqa: BLE001
        logging.exception("Failed to prepare cleaned dataset CSV", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to prepare cleaned dataset download: {exc}") from exc

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )

@router.get("/download_cleaned_file/{filename}")
async def download_cleaned_file_route(filename: str):
    return minio_service.download_cleaned_file(filename)

@router.post("/files/upload-from-url")
async def upload_from_url_route(request: UploadFromURLRequest):
    # This route is specifically for direct URL uploads, Google Drive handled elsewhere or within file_controller
    from backend.controllers import file_controller
    return await file_controller.upload_from_url(request)

@router.get("/preview/{filename}")
async def data_preview(filename: str):
    return data_controller.get_data_preview(filename)
