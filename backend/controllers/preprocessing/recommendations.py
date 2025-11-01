import logging
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd

from .io_utils import standardize_missing_indicators


def _missing_stats(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    if len(df) == 0:
        return {}
    pct = (df.isna().sum() / len(df)) * 100
    return {
        col: {"count": int(df[col].isna().sum()), "percentage": float(pct[col])}
        for col in df.columns
        if df[col].isna().any()
    }


def _outlier_percentage(series: pd.Series) -> float:
    if series.dropna().empty:
        return 0.0
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    mask = (series < lower) | (series > upper)
    return float(mask.sum() / max(len(series), 1) * 100.0)


def _near_constant(series: pd.Series, total_rows: int) -> bool:
    # near-constant if unique share <= 1%
    try:
        uniques = series.nunique(dropna=True)
    except Exception:
        return False
    if total_rows <= 0:
        return False
    return (uniques / total_rows) <= 0.01


def _infer_fill_strategy(col_name: str, dtype: str, sample_value, null_count: int) -> Tuple[str, str]:
    name = (col_name or "").lower()
    t = (dtype or "").lower()
    # basic type hints
    is_numeric = any(k in t for k in ["int", "float", "double", "decimal", "number"]) or isinstance(sample_value, (int, float, np.number))
    is_boolean = "bool" in t or isinstance(sample_value, (bool, np.bool_))
    looks_date = any(k in t for k in ["date", "time"]) or (isinstance(sample_value, pd.Timestamp))

    if looks_date or is_boolean:
        return "mode", "Temporal/boolean fields resolve cleanly to the most frequent value"

    if is_numeric:
        # Name-based hints
        if any(h in name for h in ["avg", "average", "mean", "ratio", "rate", "score", "percent"]):
            return "mean", "Rate/score-like numeric series—mean preserves scale"
        if any(h in name for h in ["amount", "price", "cost", "age", "income", "duration", "value", "size", "weight", "distance"]):
            return "median", "Magnitude-like numerics—median resists outliers"
        return "median", "Default robust numeric imputation"

    # Text/categorical
    return "mode", "Categorical/text is safest with the most frequent entry"


def build_preprocessing_suggestions(df: pd.DataFrame) -> Dict[str, Any]:
    df = standardize_missing_indicators(df)

    total_rows = len(df)
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)

    missing = _missing_stats(df)
    duplicate_rows = int(df.duplicated().sum())

    outlier_details: Dict[str, Dict[str, float]] = {}
    for col in numeric_cols:
        try:
            pct = _outlier_percentage(df[col].astype(float))
        except Exception:
            pct = 0.0
        if pct > 0:
            outlier_details[col] = {"percentage": pct}

    drop_candidates: List[str] = []
    drop_detail: Dict[str, Dict[str, str]] = {}
    for col in df.columns:
        miss_pct = missing.get(col, {}).get("percentage", 0.0)
        if miss_pct >= 80.0:
            drop_candidates.append(col)
            drop_detail[col] = {"reason": f"{miss_pct:.1f}% missing"}
            continue
        if _near_constant(df[col], total_rows):
            drop_candidates.append(col)
            drop_detail[col] = {"reason": "Near-constant (<=1% unique)"}

    # Determine when removeNulls is cheaper than fillNulls
    rows_with_any_null = int(df.isna().any(axis=1).sum()) if total_rows > 0 else 0
    small_row_impact = total_rows > 0 and (rows_with_any_null / total_rows) <= 0.03

    fill_columns = [c for c in df.columns if missing.get(c, {"count": 0})["count"] > 0 and c not in drop_candidates]
    strategies: Dict[str, Dict[str, str]] = {}
    for col in fill_columns:
        dtype = str(df[col].dtype)
        non_null = df[col].dropna()
        sample_val = non_null.iloc[0] if not non_null.empty else None
        strat, reason = _infer_fill_strategy(col, dtype, sample_val, missing.get(col, {}).get("count", 0))
        strategies[col] = {"strategy": strat, "reason": reason, "value": ""}

    # Outlier suggestion
    outlier_cols = [c for c, info in outlier_details.items() if info.get("percentage", 0.0) > 5.0]
    outlier_reason = "Outliers > 5% detected in some numeric columns" if outlier_cols else "No significant outliers"

    suggestions: Dict[str, Any] = {
        "removeDuplicates": {
            "enabled": duplicate_rows > 0,
            "subset": [],
            "reason": f"Found {duplicate_rows} duplicate rows" if duplicate_rows > 0 else "No duplicates",
        },
        "dropColumns": {
            "enabled": len(drop_candidates) > 0,
            "columns": drop_candidates,
            "reason": "Columns with heavy missingness or near-constant variance",
            "details": drop_detail,
        },
        "fillNulls": {
            "enabled": len(fill_columns) > 0 and not small_row_impact,
            "columns": fill_columns,
            "strategies": strategies,
            "reason": "Missing values detected; imputation preferred over row removal",
        },
        "removeNulls": {
            "enabled": small_row_impact and rows_with_any_null > 0,
            "columns": fill_columns if small_row_impact else [],
            "reason": "Few rows contain nulls; dropping rows has low impact" if small_row_impact else "Row removal would be costly",
        },
        "removeOutliers": {
            "enabled": len(outlier_cols) > 0,
            "method": "iqr",
            "factor": 1.5,
            "columns": outlier_cols,
            "reason": outlier_reason,
            "details": outlier_details,
        },
    }

    quality_summary = {
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "missing_data": missing,
        "duplicate_rows": duplicate_rows,
        "outliers": outlier_details,
        "data_types": {c: str(df[c].dtype) for c in df.columns},
    }

    return {"suggestions": suggestions, "quality_summary": quality_summary}
