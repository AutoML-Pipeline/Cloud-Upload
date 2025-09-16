from typing import List, Tuple, Dict
import pandas as pd


def apply(df: pd.DataFrame, columns: List[str] | None) -> Tuple[pd.DataFrame, Dict]:
    before = len(df)
    if columns:
        df2 = df.dropna(subset=columns)
    else:
        df2 = df.dropna()
    removed = before - len(df2)
    meta = {
        "operation": "Remove Nulls",
        "rows_removed": removed,
        "columns": columns or "all",
    }
    return df2, meta


