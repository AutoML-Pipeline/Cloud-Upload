import copy
import uuid
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, Optional


class JobNotFoundError(KeyError):
    """Raised when attempting to access a job that does not exist."""


_lock = Lock()
_jobs: Dict[str, Dict[str, Any]] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_job() -> str:
    """Create a new progress job and return its identifier."""
    job_id = uuid.uuid4().hex
    timestamp = _utc_now_iso()
    job_payload = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Queued",
        "result": None,
        "error": None,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    with _lock:
        _jobs[job_id] = job_payload
    return job_id


def update_job(job_id: str, *, progress: Optional[float] = None, message: Optional[str] = None,
               status: Optional[str] = None) -> Dict[str, Any]:
    """Update the given job with the provided values."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            raise JobNotFoundError(job_id)

        if progress is not None:
            progress_value = max(0.0, min(100.0, float(progress)))
            job["progress"] = progress_value
        if message is not None:
            job["message"] = message
        if status is not None:
            job["status"] = status
        job["updated_at"] = _utc_now_iso()
        return copy.deepcopy(job)


def complete_job(job_id: str, result: Any, message: str = "Preprocessing complete") -> Dict[str, Any]:
    """Mark the job as completed with the provided result."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            raise JobNotFoundError(job_id)
        job.update({
            "status": "completed",
            "progress": 100.0,
            "message": message,
            "result": result,
            "error": None,
            "updated_at": _utc_now_iso(),
        })
        return copy.deepcopy(job)


def fail_job(job_id: str, error_message: str) -> Dict[str, Any]:
    """Mark the job as failed and capture the error message."""
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            raise JobNotFoundError(job_id)
        job.update({
            "status": "failed",
            "progress": 100.0,
            "message": "Preprocessing failed",
            "error": error_message,
            "updated_at": _utc_now_iso(),
        })
        return copy.deepcopy(job)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Return a copy of the job payload if it exists."""
    with _lock:
        job = _jobs.get(job_id)
        return copy.deepcopy(job) if job is not None else None


def reset_job(job_id: str) -> None:
    """Remove a job from the tracker."""
    with _lock:
        _jobs.pop(job_id, None)
