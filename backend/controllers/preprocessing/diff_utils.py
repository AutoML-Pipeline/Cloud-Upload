from typing import Dict, List, Tuple
import pandas as pd


def compute_diff_marks(original: pd.DataFrame, cleaned: pd.DataFrame) -> Tuple[List[int], Dict[int, Dict[str, bool]]]:
    # Determine deleted rows by original index not present in cleaned
    orig_indices = set(original["_orig_idx"].tolist()) if "_orig_idx" in original.columns else set(original.index.tolist())
    cleaned_indices = set(cleaned["_orig_idx"].tolist()) if "_orig_idx" in cleaned.columns else set(cleaned.index.tolist())
    deleted = sorted(list(orig_indices - cleaned_indices))

    # Align on _orig_idx to detect cell updates
    common = sorted(list(orig_indices & cleaned_indices))
    if "_orig_idx" not in original.columns:
        original = original.reset_index(drop=False).rename(columns={"index": "_orig_idx"})
    if "_orig_idx" not in cleaned.columns:
        cleaned = cleaned.reset_index(drop=False).rename(columns={"index": "_orig_idx"})

    o = original.set_index("_orig_idx")
    c = cleaned.set_index("_orig_idx")
    cols = [col for col in o.columns if col in c.columns and col != "_orig_idx"]

    updated_cells: Dict[int, Dict[str, bool]] = {}
    for idx in common:
        if idx in o.index and idx in c.index:
            row_o = o.loc[idx, cols]
            row_c = c.loc[idx, cols]
            diff_mask = row_o.ne(row_c)
            changed_cols = diff_mask[diff_mask].index.tolist()
            if changed_cols:
                updated_cells[idx] = {col: True for col in changed_cols}

    return deleted, updated_cells


