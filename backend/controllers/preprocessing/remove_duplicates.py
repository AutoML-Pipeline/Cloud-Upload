from typing import List, Tuple, Dict
import pandas as pd


def apply(df: pd.DataFrame, subset: List[str] | None) -> Tuple[pd.DataFrame, Dict]:
    before = len(df)
    df2 = df.drop_duplicates(subset=subset or None, keep="first")
    removed = before - len(df2)
    meta = {
        "summary": [f"Remove Duplicates: removed {removed} rows (subset={subset or 'all'})"],
    }
    return df2, meta


