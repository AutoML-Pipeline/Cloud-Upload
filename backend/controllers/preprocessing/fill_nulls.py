from typing import Dict, Tuple
import pandas as pd


def apply(df: pd.DataFrame, strategies: Dict[str, Dict]) -> Tuple[pd.DataFrame, Dict]:
    df2 = df.copy()
    meta_list = []
    for col, info in (strategies or {}).items():
        strategy = (info.get("strategy") or "mean").lower()
        value = info.get("value")
        if col not in df2.columns:
            continue
        if strategy == "mean":
            fill_val = df2[col].mean()
        elif strategy == "median":
            fill_val = df2[col].median()
        elif strategy == "mode":
            try:
                fill_val = df2[col].mode(dropna=True).iloc[0]
            except Exception:
                fill_val = None
        elif strategy == "custom":
            fill_val = value
        else:
            fill_val = None
        df2[col] = df2[col].fillna(fill_val)
        meta_list.append({
            "operation": "Fill Nulls",
            "column": col,
            "strategy": strategy,
            "value": fill_val
        })
    return df2, {"summary": meta_list}


