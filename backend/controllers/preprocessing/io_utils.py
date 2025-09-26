import os
import tempfile
from typing import Tuple
import pandas as pd
import numpy as np
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
    """Ensure dataframe can be saved to parquet without Decimal/float conflicts and with stable dtypes.
    - If a column contains Decimal values or object mixed with numbers, cast to float where possible.
    - Leave non-numeric objects as-is.
    """
    df2 = df.copy()
    for col in df2.columns:
        series = df2[col]
        # If series has Decimal values or object dtype with numeric-like values, convert to float
        if series.dtype == object:
            has_decimal = series.map(lambda v: isinstance(v, Decimal)).any()
            if has_decimal:
                df2[col] = series.astype(object).map(lambda v: float(v) if v is not None else None)
            else:
                # try coercing to numeric where possible (won't affect non-numeric text)
                try:
                    coerced = pd.to_numeric(series, errors="ignore")
                    df2[col] = coerced
                except Exception:
                    pass
        # If float types, leave as is; ints with NA become pandas nullable which is fine
    return df2


def to_preview_records(df: pd.DataFrame, limit: int | None) -> list[dict]:
    if limit is not None:
        df = df.head(limit)
    # Replace Inf/NaN with None so JSON is valid
    safe = df.replace([np.inf, -np.inf], np.nan)
    # Convert to native Python types with None for missing
    safe = safe.where(pd.notna(safe), None)
    records = safe.to_dict(orient="records")
    return records


