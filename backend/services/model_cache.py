"""In-memory cache for unsaved trained models and metadata.
Thread-safe store keyed by job_id.
"""
from threading import Lock
from typing import Any, Dict, Optional

_store: Dict[str, Dict[str, Any]] = {}
_lock = Lock()


def put(job_id: str, payload: Dict[str, Any]) -> None:
    with _lock:
        _store[job_id] = payload


def get(job_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        return _store.get(job_id)


def pop(job_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        return _store.pop(job_id, None)
