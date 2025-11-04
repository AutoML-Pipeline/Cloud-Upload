from typing import Any, Dict, Optional

from backend.services import pipeline_service


def start_run(title: Optional[str], source_filename: Optional[str], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return pipeline_service.create_pipeline_run(title=title, source_filename=source_filename, metadata=metadata)


def get_run(run_id: str) -> Dict[str, Any]:
    return pipeline_service.get_pipeline_run(run_id)


def patch_run(run_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    return pipeline_service.patch_pipeline_run(run_id, patch)
