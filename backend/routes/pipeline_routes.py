from fastapi import APIRouter, HTTPException
from typing import Any, Dict

from backend.controllers import pipeline_controller
from backend.models.pydantic_models import StartPipelineRequest, PatchPipelineRequest

router = APIRouter()

@router.post("/start")
async def start_pipeline_run(payload: StartPipelineRequest):
    try:
        manifest = pipeline_controller.start_run(
            title=payload.title,
            source_filename=payload.source_filename,
            metadata=payload.metadata,
        )
        return manifest
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/runs/{run_id}")
async def get_pipeline_run(run_id: str):
    try:
        return pipeline_controller.get_run(run_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found: {exc}") from exc


@router.patch("/runs/{run_id}")
async def patch_pipeline_run(run_id: str, payload: PatchPipelineRequest):
    try:
        return pipeline_controller.patch_run(run_id, payload.patch)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
