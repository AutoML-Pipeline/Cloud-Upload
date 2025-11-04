import io
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from backend.config import minio_client, TRAINING_RESULTS_BUCKET

PIPELINE_RUNS_PREFIX = "pipeline-runs"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _object_name_for_run(run_id: str) -> str:
    return f"{PIPELINE_RUNS_PREFIX}/{run_id}/run.json"


def _ensure_bucket():
    try:
        if not minio_client.bucket_exists(TRAINING_RESULTS_BUCKET):
            minio_client.make_bucket(TRAINING_RESULTS_BUCKET)
    except Exception as exc:  # noqa: BLE001
        logging.error("Failed to ensure TRAINING_RESULTS bucket: %s", exc)
        raise


def create_pipeline_run(
    title: Optional[str] = None,
    source_filename: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a new pipeline run manifest and store it in MinIO.

    Returns the persisted manifest including the generated run_id.
    """
    _ensure_bucket()
    run_id = str(uuid.uuid4())
    manifest: Dict[str, Any] = {
        "run_id": run_id,
        "title": title or f"Pipeline Run {run_id[:8]}",
        "status": "pending",  # pending -> running -> completed/failed
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "source_filename": source_filename,
        "stages": {
            "ingestion": {"status": "pending", "artifacts": [], "started_at": None, "completed_at": None},
            "preprocessing": {"status": "pending", "artifacts": [], "started_at": None, "completed_at": None},
            "feature_engineering": {"status": "pending", "artifacts": [], "started_at": None, "completed_at": None},
            "training": {"status": "pending", "artifacts": [], "started_at": None, "completed_at": None, "metrics": {}},
            "prediction": {"status": "pending", "artifacts": [], "started_at": None, "completed_at": None, "metrics": {}},
        },
        "metadata": metadata or {},
    }

    object_name = _object_name_for_run(run_id)
    data = json.dumps(manifest).encode("utf-8")
    minio_client.put_object(
        TRAINING_RESULTS_BUCKET,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type="application/json",
    )
    return manifest


def _read_manifest(run_id: str) -> Dict[str, Any]:
    _ensure_bucket()
    object_name = _object_name_for_run(run_id)
    response = minio_client.get_object(TRAINING_RESULTS_BUCKET, object_name)
    try:
        raw = response.read()
    finally:
        response.close()
        response.release_conn()
    return json.loads(raw.decode("utf-8"))


def get_pipeline_run(run_id: str) -> Dict[str, Any]:
    return _read_manifest(run_id)


def patch_pipeline_run(run_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    """Apply a patch to a pipeline run manifest and persist it.

    Behavior:
    - For top-level keys other than 'stages', perform a shallow merge/overwrite.
    - For 'stages', perform a nested, per-stage shallow merge:
      provided stage objects are merged into existing ones without dropping other stages.
    """
    manifest = _read_manifest(run_id)

    # Handle nested merge for stages
    stages_patch = patch.pop("stages", None)
    if isinstance(stages_patch, dict):
        manifest.setdefault("stages", {})
        for stage_name, stage_obj in stages_patch.items():
            if not isinstance(stage_obj, dict):
                continue
            existing = manifest["stages"].get(stage_name, {})
            # shallow merge stage object
            merged = {**existing, **stage_obj}
            manifest["stages"][stage_name] = merged

    # Shallow merge remaining top-level keys
    for k, v in patch.items():
        manifest[k] = v

    manifest["updated_at"] = _now_iso()
    object_name = _object_name_for_run(run_id)
    data = json.dumps(manifest).encode("utf-8")
    minio_client.put_object(
        TRAINING_RESULTS_BUCKET,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type="application/json",
    )
    return manifest
