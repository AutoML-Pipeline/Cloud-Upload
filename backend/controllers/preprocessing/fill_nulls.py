import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Tuple

import pandas as pd


def _resolve_fill_value(series: pd.Series, strategy: str, value):
    if strategy == "mean":
        return series.mean()
    if strategy == "median":
        return series.median()
    if strategy == "mode":
        try:
            return series.mode(dropna=True).iloc[0]
        except Exception:
            return None
    if strategy == "custom":
        return value
    return None


def _fill_column(df: pd.DataFrame, column: str, info: Dict) -> Tuple[str, pd.Series, Dict]:
    strategy = (info.get("strategy") or "mean").lower()
    value = info.get("value")
    base_series = df[column]
    fill_val = _resolve_fill_value(base_series, strategy, value)
    filled = base_series.fillna(fill_val)
    meta = {
        "operation": "Fill Nulls",
        "column": column,
        "strategy": strategy,
        "value": fill_val,
    }
    return column, filled, meta


def apply(df: pd.DataFrame, strategies: Dict[str, Dict]) -> Tuple[pd.DataFrame, Dict]:
    strategies = strategies or {}
    df2 = df.copy()
    meta_list = []
    valid_columns = [col for col in strategies.keys() if col in df2.columns]
    if not valid_columns:
        return df2, {"summary": meta_list}

    max_workers = min(len(valid_columns), max(1, os.cpu_count() or 1))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_fill_column, df, col, strategies[col]): col
            for col in valid_columns
        }
        for future in as_completed(futures):
            column, filled_series, meta = future.result()
            df2[column] = filled_series
            meta_list.append(meta)

    return df2, {"summary": meta_list}


