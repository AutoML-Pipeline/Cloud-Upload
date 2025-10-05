import math
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd


def _to_comparable(value: Any) -> Any:
    """Normalize values so equality checks behave predictably, even for array-likes."""
    if isinstance(value, pd.Series):
        value = value.to_list()
    if isinstance(value, np.ndarray):
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        normalized = [_to_comparable(item) for item in value]
        return normalized
    if isinstance(value, dict):
        return {key: _to_comparable(val) for key, val in sorted(value.items())}
    if hasattr(pd, "Timestamp") and isinstance(value, pd.Timestamp):
        return value.isoformat()

    # Convert numpy scalar types to their Python equivalents
    if isinstance(value, np.generic):
        value = value.item()

    # Treat NaN-like values uniformly as None for comparison
    try:
        if pd.isna(value):  # type: ignore[arg-type]
            return None
    except Exception:
        pass

    return value


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
    if not common or not cols:
        return deleted, updated_cells

    o_subset = o.loc[common, cols]
    c_subset = c.loc[common, cols]
    o_records = o_subset.applymap(_to_comparable).to_dict(orient="index")
    c_records = c_subset.applymap(_to_comparable).to_dict(orient="index")

    def _process_chunk(indices: List[int]) -> Dict[int, Dict[str, bool]]:
        chunk_updates: Dict[int, Dict[str, bool]] = {}
        for idx in indices:
            row_o = o_records.get(idx, {})
            row_c = c_records.get(idx, {})
            changed = [col for col in cols if row_o.get(col) != row_c.get(col)]
            if changed:
                chunk_updates[idx] = {col: True for col in changed}
        return chunk_updates

    worker_cap = max(1, os.cpu_count() or 1)
    max_workers = min(worker_cap, max(1, len(common) // 500 or 1))
    if max_workers <= 1:
        updated_cells = _process_chunk(common)
        return deleted, updated_cells

    chunk_size = max(100, math.ceil(len(common) / max_workers))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_process_chunk, common[i : i + chunk_size])
            for i in range(0, len(common), chunk_size)
        ]
        for future in futures:
            updated_cells.update(future.result())

    return deleted, updated_cells


