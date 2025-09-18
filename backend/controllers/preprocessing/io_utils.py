import io
from typing import Tuple
import pandas as pd
import numpy as np
from decimal import Decimal
from minio import Minio
from backend.config import MINIO_BUCKET, minio_client


def read_parquet_from_minio(filename: str) -> pd.DataFrame:
    response = minio_client.get_object(MINIO_BUCKET, filename)
    data = io.BytesIO(response.read())
    df = pd.read_parquet(data, engine="pyarrow")
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


