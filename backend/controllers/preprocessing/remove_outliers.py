import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple


def _iqr_bounds(series: pd.Series, factor: float) -> Tuple[float, float]:
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - factor * iqr
    upper = q3 + factor * iqr
    return lower, upper


def apply(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Remove outliers from numeric columns.

    config = {
      "columns": Optional[List[str]],  # default: all numeric columns
      "method": "iqr",                # currently only IQR supported
      "factor": float                  # IQR factor, default 1.5
    }
    """
    method = (config or {}).get("method", "iqr").lower()
    factor = float((config or {}).get("factor", 1.5))
    columns: List[str] = (config or {}).get("columns") or []

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not columns:
        target_cols = numeric_cols
    else:
        # only numeric intersection
        target_cols = [c for c in columns if c in numeric_cols]

    if not target_cols:
        return df.copy(), {"summary": ["Remove Outliers: no numeric columns to process"], "rows_removed": 0}

    mask_keep = pd.Series(True, index=df.index)
    bounds_info = {}

    if method == "iqr":
        for col in target_cols:
            lower, upper = _iqr_bounds(df[col].dropna(), factor)
            bounds_info[col] = {"lower": float(lower), "upper": float(upper)}
            mask_keep &= df[col].between(lower, upper) | df[col].isna()
    elif method == "zscore":
        for col in target_cols:
            series = df[col]
            mu = series.mean()
            sigma = series.std(ddof=0)
            if sigma == 0 or np.isnan(sigma):
                # No variance; keep all values for this column
                bounds_info[col] = {"z_threshold": float(factor), "mean": float(mu), "std": float(sigma if not np.isnan(sigma) else 0.0)}
                continue
            z = (series - mu) / sigma
            bounds_info[col] = {"z_threshold": float(factor), "mean": float(mu), "std": float(sigma)}
            mask_keep &= (z.abs() <= factor) | series.isna()
    else:
        # Fallback: keep all
        return df.copy(), {"summary": [f"Remove Outliers: unsupported method '{method}'"], "rows_removed": 0}

    before = len(df)
    df_out = df[mask_keep].copy()
    removed = before - len(df_out)

    pretty_method = "IQR" if method == "iqr" else "Z-Score"
    meta = {
        "summary": [f"Remove Outliers (method={pretty_method}, factor={factor}) on {len(target_cols)} cols: removed {removed} rows"],
        "rows_removed": int(removed),
        "bounds": bounds_info,
    }
    return df_out, meta


