from typing import List, Tuple, Dict
import pandas as pd


def apply(df: pd.DataFrame, columns: List[str]) -> Tuple[pd.DataFrame, Dict]:
    existing = [c for c in (columns or []) if c in df.columns]
    df2 = df.drop(columns=existing, errors="ignore")
    return df2, {
        "operation": "Drop Columns",
        "columns_dropped": existing
    }


