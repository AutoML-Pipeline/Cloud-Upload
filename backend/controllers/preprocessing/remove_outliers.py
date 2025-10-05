import os
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd


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

    def _process_column(col: str) -> Tuple[pd.Series, Dict[str, float]]:
        series = df[col]
        if method == "iqr":
            clean_series = series.dropna()
            if clean_series.empty:
                return pd.Series(True, index=df.index), {"lower": float("nan"), "upper": float("nan")}
            lower, upper = _iqr_bounds(clean_series, factor)
            mask = series.between(lower, upper) | series.isna()
            info = {"lower": float(lower), "upper": float(upper)}
            return mask, info
        if method == "zscore":
            mu = series.mean()
            sigma = series.std(ddof=0)
            if sigma == 0 or np.isnan(sigma):
                info = {"z_threshold": float(factor), "mean": float(mu if not np.isnan(mu) else 0.0), "std": float(sigma if not np.isnan(sigma) else 0.0)}
                return pd.Series(True, index=df.index), info
            z = (series - mu) / sigma
            mask = (z.abs() <= factor) | series.isna()
            info = {"z_threshold": float(factor), "mean": float(mu), "std": float(sigma)}
            return mask, info
        # Unsupported method fallback: keep all
        return pd.Series(True, index=df.index), {"unsupported_method": method}

    max_workers = min(len(target_cols), max(1, os.cpu_count() or 1))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for col, (mask_column, info) in zip(
            target_cols,
            executor.map(_process_column, target_cols),
        ):
            mask_keep &= mask_column
            bounds_info[col] = info

    if method not in {"iqr", "zscore"}:
        return df.copy(), {"summary": [f"Remove Outliers: unsupported method '{method}'"], "rows_removed": 0}

    before = len(df)
    df_out = df[mask_keep].copy()
    removed = before - len(df_out)

    pretty_method = "IQR" if method == "iqr" else "Z-Score"
    meta = {
        "operation": "Remove Outliers",
        "method": pretty_method,
        "factor": factor,
        "columns": target_cols or "all",
        "rows_removed": int(removed),
        "bounds": bounds_info,
    }
    return df_out, meta


