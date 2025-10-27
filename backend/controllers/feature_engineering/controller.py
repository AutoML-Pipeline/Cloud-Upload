import asyncio
import io
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd

from backend.config import CLEANED_BUCKET, minio_client
from backend.controllers.feature_engineering.operations import (
    apply_binning,
    apply_encoding,
    apply_feature_creation,
    apply_feature_selection,
    apply_scaling,
)
from backend.controllers.feature_engineering.types import (
    ApplyFeatureEngineeringRequest,
    FeatureEngineeringJobResult,
    FeatureEngineeringPreviewRequest,
    FeatureEngineeringResponse,
    FeatureEngineeringSummary,
    MinioFile,
    RunFeatureEngineeringRequest,
)
from backend.controllers.feature_engineering.recommendations import analyze_dataset
from backend.controllers.preprocessing.io_utils import (
    sanitize_dataframe_for_parquet,
    standardize_missing_indicators,
    to_preview_records,
)
from backend.services import minio_service, progress_tracker
from backend.utils.json_utils import _to_json_safe

FEATURE_ENGINEERED_BUCKET = os.getenv("FEATURE_ENGINEERED_BUCKET", "feature-engineered")
PREVIEW_ROW_LIMIT = None  # No limit - show full dataset


async def get_minio_files_for_feature_engineering() -> List[MinioFile]:
    files: List[MinioFile] = []
    try:
        objects = minio_client.list_objects(CLEANED_BUCKET, recursive=True)
        for obj in objects:
            if getattr(obj, "is_dir", False):
                continue
            files.append(
                MinioFile(
                    name=obj.object_name,
                    last_modified=getattr(obj, "last_modified", None).isoformat()
                    if getattr(obj, "last_modified", None)
                    else None,
                    size=getattr(obj, "size", None),
                )
            )
    except Exception:  # noqa: BLE001
        logging.exception("Failed to list cleaned-data files from MinIO")
        raise
    return files


async def get_dataset_analysis_with_recommendations(filename: str):
    """Analyze dataset and provide feature engineering recommendations"""
    try:
        df = _load_dataframe_from_minio(filename, CLEANED_BUCKET)
        analysis = analyze_dataset(df, filename)
        return analysis.model_dump()
    except Exception as e:
        logging.error(f"Error analyzing dataset: {str(e)}")
        raise


def _load_dataframe_from_minio(filename: str, bucket_name: str) -> pd.DataFrame:
    response = minio_client.get_object(bucket_name, filename)
    try:
        data = io.BytesIO(response.read())
    finally:
        response.close()
        response.release_conn()

    if filename.endswith(".parquet"):
        df = pd.read_parquet(data, engine="pyarrow")
    elif filename.endswith(".csv"):
        df = pd.read_csv(data)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(data)
    elif filename.endswith(".json"):
        df = pd.read_json(data)
    else:
        raise ValueError("Unsupported file format")

    return standardize_missing_indicators(df)


def _filter_ml_columns(df: pd.DataFrame) -> pd.DataFrame:
    exclude_columns = {
        "_orig_idx",
        "customer_id",
        "id",
        "index",
        "row_id",
        "uuid",
        "key",
    }

    ml_columns = [col for col in df.columns if col.lower() not in exclude_columns]
    if not ml_columns:
        return df
    return df[ml_columns]


def _apply_step(df: pd.DataFrame, step_config) -> tuple[pd.DataFrame, Dict[str, Any]]:
    import time
    start_time = time.time()
    
    try:
        if step_config.type == "scaling":
            column_methods = getattr(step_config, 'column_methods', None)
            result = apply_scaling(df, step_config.columns, step_config.method, column_methods)
        elif step_config.type == "encoding":
            column_methods = getattr(step_config, 'column_methods', None)
            result = apply_encoding(df, step_config.columns, step_config.method, column_methods)
        elif step_config.type == "binning":
            column_methods = getattr(step_config, 'column_methods', None)
            result = apply_binning(df, step_config.columns, step_config.method, step_config.bins, column_methods)
        elif step_config.type == "feature_creation":
            result = apply_feature_creation(
                df,
                step_config.columns,
                step_config.method,
                degree=step_config.degree,
                date_part=step_config.date_part,
                aggregation_type=step_config.aggregation_type,
                new_column_name=step_config.new_column_name,
            )
        elif step_config.type == "feature_selection":
            result = apply_feature_selection(
                df,
                step_config.columns,
                step_config.method,
                threshold=step_config.threshold,
                n_components=step_config.n_components,
            )
        else:
            raise ValueError(f"Unknown feature engineering step type: {step_config.type}")
        
        elapsed = time.time() - start_time
        df_result, meta = result
        logging.info(f"⏱️  Step '{step_config.type}' completed in {elapsed:.2f}s | Rows: {len(df_result)} | Cols: {len(df_result.columns)}")
        return df_result, meta
    except Exception as e:
        elapsed = time.time() - start_time
        logging.error(f"❌ Step '{step_config.type}' failed after {elapsed:.2f}s: {str(e)}")
        raise


def _summarize_columns(original: Sequence[str], engineered: Sequence[str]) -> Dict[str, Any]:
    original_list = list(original)
    engineered_list = list(engineered)
    added = [col for col in engineered_list if col not in original_list]
    removed = [col for col in original_list if col not in engineered_list]
    return {
        "original": original_list,
        "engineered": engineered_list,
        "added": added,
        "removed": removed,
    }


def _update_progress(job_id: Optional[str], progress: float, message: str) -> None:
    if not job_id:
        return
    try:
        progress_tracker.update_job(job_id, progress=progress, message=message, status="running")
    except progress_tracker.JobNotFoundError:
        logging.warning("Feature engineering job %s no longer tracked", job_id)


def run_feature_engineering_pipeline(
    filename: str,
    steps: List[Any],
    *,
    upto_step: Optional[int] = None,
    include_temp_file: bool = True,
    job_id: Optional[str] = None,
) -> FeatureEngineeringJobResult:
    import time
    pipeline_start = time.time()
    
    steps = steps or []
    _update_progress(job_id, 5, "Loading dataset from storage")
    df_raw = _load_dataframe_from_minio(filename, CLEANED_BUCKET)
    _update_progress(job_id, 12, f"Dataset loaded ({len(df_raw)} rows)")

    filtered_df = _filter_ml_columns(df_raw)
    _update_progress(job_id, 18, f"{len(filtered_df.columns)} columns ready for feature engineering")

    original_df = filtered_df.copy()
    processed_df = filtered_df.copy()
    change_metadata: List[Dict[str, Any]] = []

    total_steps = 0 if not steps else (upto_step + 1 if upto_step is not None else len(steps))
    for index, step_config in enumerate(steps):
        if upto_step is not None and index > upto_step:
            break
        processed_df, meta = _apply_step(processed_df, step_config)
        # Ensure details field exists in metadata
        if "details" not in meta:
            meta["details"] = {}
        summary = FeatureEngineeringSummary(**meta).model_dump()
        change_metadata.append(summary)
        progress_fraction = (index + 1) / max(total_steps, 1)
        _update_progress(
            job_id,
            20 + int(60 * progress_fraction),
            f"Applied {summary.get('operation', 'feature')} step",
        )

    column_summary = _summarize_columns(original_df.columns, processed_df.columns)

    # Show FULL dataset in preview (no row limit)
    preview = to_preview_records(processed_df, None)
    original_preview = to_preview_records(original_df, None)
    
    pipeline_elapsed = time.time() - pipeline_start
    logging.info(f"✅ Feature Engineering Pipeline completed in {pipeline_elapsed:.2f}s | Rows: {len(processed_df)} | Cols: {len(processed_df.columns)}")

    result_payload: Dict[str, Any] = {
        "preview": preview,
        "original_preview": original_preview,
        "change_metadata": change_metadata,
        "message": "Feature engineering applied successfully",
        "original_row_count": int(len(original_df)),
        "engineered_row_count": int(len(processed_df)),
        "preview_row_limit": None,  # No limit - showing full dataset
        "column_summary": column_summary,
        "engineered_filename": None,
        "temp_engineered_path": None,
        "full_data_included": True,  # Always true now
    }

    if include_temp_file:
        _update_progress(job_id, 86, "Staging engineered dataset for download")
        df_to_save = sanitize_dataframe_for_parquet(processed_df)
        logging.info(f"Staging engineered dataset with {len(df_to_save)} rows (original: {len(original_df)}, processed: {len(processed_df)})")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmp_file:
            df_to_save.to_parquet(tmp_file.name, engine="pyarrow", index=False)
            temp_path = tmp_file.name
            # Verify file was written correctly
            verify_df = pd.read_parquet(temp_path)
            logging.info(f"Verified temp engineered file has {len(verify_df)} rows after write")
        base_name = os.path.splitext(os.path.basename(filename))[0]
        engineered_filename = f"feature_engineered_{base_name}.parquet"
        result_payload["engineered_filename"] = engineered_filename
        result_payload["temp_engineered_path"] = temp_path

    _update_progress(job_id, 94, "Preparing preview tables")
    return FeatureEngineeringJobResult(**_to_json_safe(result_payload))


async def get_feature_engineering_preview(request: FeatureEngineeringPreviewRequest) -> FeatureEngineeringResponse:
    try:
        upto = request.current_step_index if request.current_step_index >= 0 else None
        result = await asyncio.to_thread(
            run_feature_engineering_pipeline,
            request.filename,
            request.steps,
            upto_step=upto,
            include_temp_file=False,
            job_id=None,
        )
        return FeatureEngineeringResponse(**result.model_dump())
    except Exception as exc:  # noqa: BLE001
        logging.exception("Feature engineering preview failed")
        return FeatureEngineeringResponse(
            preview=[],
            original_preview=[],
            change_metadata=[],
            message=f"Error generating preview: {exc}",
        )


async def apply_and_save_feature_engineering(request: ApplyFeatureEngineeringRequest) -> Dict[str, str]:
    try:
        result = await asyncio.to_thread(
            run_feature_engineering_pipeline,
            request.filename,
            request.steps,
            upto_step=None,
            include_temp_file=True,
            job_id=None,
        )
        temp_path = result.temp_engineered_path
        engineered_filename = result.engineered_filename
        if not temp_path or not engineered_filename:
            return {"error": "Unable to stage engineered dataset for saving"}

        save_result = minio_service.save_feature_engineered_temp(temp_path, engineered_filename)
        if "error" in save_result:
            return save_result
        return {"message": save_result.get("message", "Engineered data saved successfully.")}
    except Exception as exc:  # noqa: BLE001
        logging.exception("Apply and save feature engineering failed")
        return {"error": f"Error applying and saving feature engineering: {exc}"}


async def run_feature_engineering_job(job_id: str, request: RunFeatureEngineeringRequest) -> None:
    try:
        progress_tracker.update_job(
            job_id,
            status="running",
            progress=1,
            message="Initializing feature engineering pipeline",
        )
    except progress_tracker.JobNotFoundError:
        logging.warning("Feature engineering job %s started but is no longer tracked", job_id)

    try:
        result = await asyncio.to_thread(
            run_feature_engineering_pipeline,
            request.filename,
            request.steps,
            upto_step=None,
            include_temp_file=True,
            job_id=job_id,
        )
        progress_tracker.complete_job(job_id, result.model_dump(), message="Feature engineering complete")
    except Exception as exc:  # noqa: BLE001
        logging.exception("Feature engineering job %s failed", job_id, exc_info=True)
        try:
            progress_tracker.fail_job(job_id, str(exc))
        except progress_tracker.JobNotFoundError:
            logging.warning("Unable to mark feature engineering job %s as failed; job no longer tracked", job_id)


async def get_feature_engineering_dataset_preview(filename: str, bucket: str = "cleaned-data") -> Dict[str, Any]:
    try:
        df = _load_dataframe_from_minio(filename, bucket)
    except Exception as exc:  # noqa: BLE001
        logging.exception("Error loading dataset %s for preview from bucket %s", filename, bucket)
        return {"error": f"Error reading file from MinIO: {exc}"}

    # Calculate stats from FULL dataset
    columns = list(df.columns)
    dtypes = {col: str(df[col].dtype) for col in columns}
    null_counts = {col: int(df[col].isnull().sum()) for col in columns}
    cardinality = {col: int(df[col].nunique()) for col in columns}

    sample_values: Dict[str, Any] = {}
    for col in columns:
        series = df[col].dropna()
        sample_values[col] = _to_json_safe(series.iloc[0]) if not series.empty else None

    # Show FULL dataset in preview (no row limit)
    preview_records = to_preview_records(df, None)
    
    logging.info(f"Feature Engineering Preview: showing all {len(df)} rows")

    return _to_json_safe(
        {
        "columns": columns,
        "dtypes": dtypes,
        "null_counts": null_counts,
        "sample_values": sample_values,
        "cardinality": cardinality,
        "preview": preview_records,
        "total_rows": len(df),
        "preview_rows": len(df),
        }
    )

