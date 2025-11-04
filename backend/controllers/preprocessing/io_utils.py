import os
import tempfile
from typing import Any, Tuple
import json
import pandas as pd
import numpy as np
from pandas.api import types as ptypes
from decimal import Decimal
from backend.config import MINIO_BUCKET, minio_client


CHUNK_SIZE = 32 * 1024


def _download_to_tempfile(object_name: str, bucket: str = MINIO_BUCKET) -> str:
    """Stream a MinIO object to a temporary file and return the path."""
    response = minio_client.get_object(bucket, object_name)
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            for chunk in response.stream(CHUNK_SIZE):
                tmp.write(chunk)
            return tmp.name
    finally:
        response.close()
        response.release_conn()


def read_parquet_from_minio(filename: str) -> pd.DataFrame:
    temp_path = _download_to_tempfile(filename)
    try:
        df = pd.read_parquet(temp_path, engine="pyarrow")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
    # Preserve a stable original index for diffing
    if "_orig_idx" not in df.columns:
        df = df.reset_index(drop=False).rename(columns={"index": "_orig_idx"})
    return df


def sanitize_dataframe_for_parquet(df: pd.DataFrame) -> pd.DataFrame:
    """Harden data so pyarrow parquet write never fails.
    Rules:
    - Keep numeric dtypes as-is (replace inf with NaN elsewhere in pipeline).
    - Convert Decimal -> float.
    - For object-dtype columns:
      - If value is list/tuple/set/dict -> JSON string via json.dumps (default=str, ensure_ascii=False)
      - If numpy scalar -> cast to native python scalar
      - If is NaN -> keep NaN
      - Else -> keep strings; non-strings coerced to str
    This avoids mixed object columns with non-scalar types that pyarrow can't serialize reliably.
    """
    df2 = df.copy()
    for col in df2.columns:
        series = df2[col]
        if series.dtype == object:
            def _coerce_obj(v: Any) -> Any:
                try:
                    # preserve NaN/None
                    if pd.isna(v):
                        return v
                except Exception:
                    pass

                # Decimal -> float
                if isinstance(v, Decimal):
                    try:
                        return float(v)
                    except Exception:
                        return None

                # numpy scalars
                if isinstance(v, np.floating):
                    return float(v) if np.isfinite(v) else np.nan
                if isinstance(v, np.integer):
                    return int(v)
                if isinstance(v, np.bool_):
                    return bool(v)

                # collections -> JSON string
                if isinstance(v, (list, tuple, set, dict)):
                    try:
                        return json.dumps(v, ensure_ascii=False, default=str)
                    except Exception:
                        return str(v)

                # keep strings, coerce others to str for safety
                if isinstance(v, (str, bytes)):
                    return v if isinstance(v, str) else v.decode('utf-8', errors='ignore')
                return str(v) if v is not None else None

            df2[col] = series.map(_coerce_obj)
        # numeric and other pandas-native types are left as-is
    return df2


def standardize_missing_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Treat common placeholder tokens, empty collections, and invalid numbers as missing."""
    if df.empty:
        return df

    def _normalize(value: Any) -> Any:
        if value is None:
            return np.nan

        if isinstance(value, float) and not np.isfinite(value):
            return np.nan

        if isinstance(value, (list, tuple, set)):
            return np.nan if len(value) == 0 else value

        if isinstance(value, dict):
            return np.nan if len(value) == 0 else value

        if isinstance(value, str):
            stripped = value.strip()
            if stripped == "":
                return np.nan
            lowered = stripped.lower()
            if lowered in {"na", "n/a", "none", "null", "nan"}:
                return np.nan
            if stripped in {"[]", "{}", "[ ]", "{ }", "()", "( )", '""', "''"}:
                return np.nan

        return value

    df2 = df.copy()
    for col in df2.columns:
        series = df2[col]
        if ptypes.is_numeric_dtype(series):
            df2[col] = series.replace([np.inf, -np.inf], np.nan)
        elif ptypes.is_object_dtype(series) or ptypes.is_string_dtype(series) or ptypes.is_categorical_dtype(series):
            df2[col] = series.map(_normalize)
        else:
            df2[col] = series.map(_normalize)

    return df2

def _sanitize_preview_value(val: Any) -> Any:
    """Convert dataframe values to JSON-serialisable forms for previews."""
    # Handle pandas/numpy containers first to avoid ambiguous truth checks
    if isinstance(val, pd.Series):
        val = val.to_list()
    if isinstance(val, np.ndarray):
        val = val.tolist()

    if isinstance(val, (list, tuple)):
        sanitized = [_sanitize_preview_value(item) for item in val]
        return sanitized

    if isinstance(val, dict):
        return {key: _sanitize_preview_value(item) for key, item in val.items()}

    if hasattr(pd, "Timestamp") and isinstance(val, pd.Timestamp):
        return val.isoformat()

    if isinstance(val, Decimal):
        val = float(val)

    if isinstance(val, np.bool_):
        return bool(val)

    if isinstance(val, np.integer):
        return int(val)

    if isinstance(val, np.floating):
        if not np.isfinite(val):
            return None
        return float(val)

    if isinstance(val, float):
        if not np.isfinite(val):
            return None
        return val

    try:
        if pd.isna(val):  # type: ignore[arg-type]
            return None
    except Exception:
        pass

    return val


def to_preview_records(df: pd.DataFrame, limit: int | None) -> list[dict]:
    if limit is not None:
        df = df.head(limit)

    sanitized_df = df.applymap(_sanitize_preview_value)
    records = sanitized_df.to_dict(orient="records")
    return records


