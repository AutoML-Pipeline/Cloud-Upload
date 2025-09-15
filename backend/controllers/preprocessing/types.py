from typing import Dict, List, Optional, TypedDict, Literal


FillStrategy = Literal["mean", "median", "mode", "custom"]


class FillStrategyItem(TypedDict, total=False):
    strategy: FillStrategy
    value: Optional[str]


class StepsPayload(TypedDict, total=False):
    removeDuplicates: bool
    duplicateSubset: List[str]
    removeNulls: bool
    removeNullsColumns: List[str]
    fillNulls: bool
    fillStrategies: Dict[str, FillStrategyItem]
    dropColumns: List[str]


class DiffMarks(TypedDict, total=False):
    deleted_row_indices: List[int]
    updated_cells: Dict[int, Dict[str, bool]]


class PreprocessResult(TypedDict, total=False):
    original_preview: List[Dict]
    preview: List[Dict]
    full_data: Optional[List[Dict]]
    diff_marks: DiffMarks
    change_metadata: List[str]
    quality_report: Dict
    temp_cleaned_path: Optional[str]
    cleaned_filename: Optional[str]


