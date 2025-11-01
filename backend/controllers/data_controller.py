# Handles data preprocessing and SQL logic
import asyncio
from typing import Optional
from fastapi import Form
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.ensemble import IsolationForest
import warnings
warnings.filterwarnings('ignore')

# TODO: Move sql_preview, sql_list_databases here from main.py

# Handles data preprocessing logic
from backend.config import minio_client, MINIO_BUCKET
import tempfile
import os
import io
import json
from fastapi import Request
import logging
import pyarrow.parquet as pq
from .preprocessing.io_utils import (
    read_parquet_from_minio,
    to_preview_records,
    sanitize_dataframe_for_parquet,
    standardize_missing_indicators,
    _download_to_tempfile,
)
from .preprocessing.remove_duplicates import apply as apply_remove_duplicates
from .preprocessing.remove_nulls import apply as apply_remove_nulls
from .preprocessing.fill_nulls import apply as apply_fill_nulls
from .preprocessing.drop_columns import apply as apply_drop_columns
from .preprocessing.remove_outliers import apply as apply_remove_outliers
from .preprocessing.diff_utils import compute_diff_marks
from backend.utils.json_utils import _to_json_safe
from backend.services import progress_tracker
from .preprocessing.recommendations import build_preprocessing_suggestions

# NO LIMITS - Show full dataset everywhere
MAX_PREVIEW_ROWS = None  # Show all rows in preview
MAX_FULL_ROWS = None  # No limit on full data
DIFF_ROW_LIMIT = int(os.getenv("DIFF_ROW_LIMIT", "10000"))  # Keep diff rows higher

def analyze_data_quality(df):
    """Comprehensive data quality analysis"""
    df = standardize_missing_indicators(df)
    quality_report = {
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'missing_data': {},
        'duplicate_rows': 0,
        'outliers': {},
        'data_types': {},
        'correlations': {},
        'quality_score': 0,
        'recommendations': []
    }
    
    # Missing data analysis
    if len(df) == 0:
        missing_percentages = pd.Series({col: 0.0 for col in df.columns})
    else:
        missing_percentages = (df.isnull().sum() / len(df)) * 100
    quality_report['missing_data'] = {
        col: {
            'count': int(df[col].isnull().sum()),
            'percentage': float(missing_percentages[col]),
            'type': 'critical' if missing_percentages[col] > 50 else 'moderate' if missing_percentages[col] > 10 else 'minor'
        }
        for col in df.columns if df[col].isnull().sum() > 0
    }
    
    # Duplicate analysis
    quality_report['duplicate_rows'] = int(df.duplicated().sum())
    
    # Data type analysis
    quality_report['data_types'] = {
        col: {
            'type': str(df[col].dtype),
            'unique_values': int(df[col].nunique()),
            'is_categorical': df[col].dtype == 'object' or df[col].nunique() < len(df) * 0.1
        }
        for col in df.columns
    }
    
    # Outlier analysis for numerical columns
    numerical_cols = df.select_dtypes(include=[np.number]).columns
    for col in numerical_cols:
        if df[col].isnull().sum() < len(df) * 0.5:  # Only analyze if not mostly missing
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            
            pct = float((len(outliers) / len(df)) * 100) if len(df) > 0 else 0.0
            quality_report['outliers'][col] = {
                'count': int(len(outliers)),
                'percentage': pct,
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound)
            }
    
    # Calculate quality score
    missing_penalty = sum(info['percentage'] for info in quality_report['missing_data'].values()) * 0.5
    duplicate_penalty = ((quality_report['duplicate_rows'] / quality_report['total_rows']) * 100) if quality_report['total_rows'] > 0 else 0
    outlier_penalty = sum(info['percentage'] for info in quality_report['outliers'].values()) * 0.3
    
    quality_report['quality_score'] = max(0, 100 - missing_penalty - duplicate_penalty - outlier_penalty)
    
    # Generate recommendations
    if quality_report['missing_data']:
        quality_report['recommendations'].append("Missing values detected - applying smart imputation")
    if quality_report['duplicate_rows'] > 0:
        quality_report['recommendations'].append(f"Found {quality_report['duplicate_rows']} duplicate rows - removing duplicates")
    if quality_report['outliers']:
        quality_report['recommendations'].append("Outliers detected - applying robust outlier handling")
    
    return quality_report

def smart_imputation(df, quality_report):
    """Intelligent imputation based on data characteristics"""
    df_cleaned = df.copy()
    
    for col in df_cleaned.columns:
        if df_cleaned[col].isnull().any():
            missing_pct = quality_report['missing_data'][col]['percentage']
            col_type = quality_report['data_types'][col]['type']
            is_categorical = quality_report['data_types'][col]['is_categorical']
            
            if missing_pct > 50:
                # Too much missing data - drop column
                df_cleaned = df_cleaned.drop(columns=[col])
                continue
            
            if is_categorical or col_type == 'object':
                # Categorical imputation
                if missing_pct < 10:
                    # Use mode for small missing data
                    mode_value = df_cleaned[col].mode()
                    if len(mode_value) > 0:
                        df_cleaned[col] = df_cleaned[col].fillna(mode_value[0])
                    else:
                        df_cleaned[col] = df_cleaned[col].fillna('Unknown')
                else:
                    # Use KNN for larger missing data
                    try:
                        # Create dummy variables for categorical columns
                        dummy_cols = pd.get_dummies(df_cleaned[col], prefix=col, dummy_na=True)
                        df_cleaned = pd.concat([df_cleaned.drop(columns=[col]), dummy_cols], axis=1)
                    except:
                        df_cleaned[col] = df_cleaned[col].fillna('Unknown')
            else:
                # Numerical imputation
                if missing_pct < 10:
                    # Use median for small missing data
                    df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].median())
                else:
                    # Use KNN for larger missing data
                    try:
                        imputer = KNNImputer(n_neighbors=min(5, len(df_cleaned) - 1))
                        df_cleaned[col] = imputer.fit_transform(df_cleaned[[col]])[:, 0]
                    except:
                        df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].median())
    
    return df_cleaned

def smart_outlier_handling(df, quality_report):
    """Intelligent outlier detection and handling"""
    df_cleaned = df.copy()
    numerical_cols = df_cleaned.select_dtypes(include=[np.number]).columns
    
    for col in numerical_cols:
        if col in quality_report['outliers']:
            outlier_pct = quality_report['outliers'][col]['percentage']
            
            if outlier_pct > 20:
                # Too many outliers - use robust scaling
                scaler = RobustScaler()
                df_cleaned[col] = scaler.fit_transform(df_cleaned[[col]])[:, 0]
            elif outlier_pct > 5:
                # Moderate outliers - cap them
                Q1 = df_cleaned[col].quantile(0.25)
                Q3 = df_cleaned[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df_cleaned[col] = df_cleaned[col].clip(lower=lower_bound, upper=upper_bound)
            else:
                # Few outliers - remove them
                Q1 = df_cleaned[col].quantile(0.25)
                Q3 = df_cleaned[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df_cleaned = df_cleaned[(df_cleaned[col] >= lower_bound) & (df_cleaned[col] <= upper_bound)]
    
    return df_cleaned

def smart_scaling(df, quality_report):
    """Intelligent feature scaling based on data distribution"""
    df_scaled = df.copy()
    numerical_cols = df_scaled.select_dtypes(include=[np.number]).columns
    
    for col in numerical_cols:
        # Check for skewness
        skewness = df_scaled[col].skew()
        
        if abs(skewness) > 1:
            # Highly skewed - use robust scaling
            scaler = RobustScaler()
        else:
            # Normal distribution - use standard scaling
            scaler = StandardScaler()
        
        df_scaled[col] = scaler.fit_transform(df_scaled[[col]])[:, 0]
    
    return df_scaled

def get_original_preview(df):
    return df.head(10).replace([float('nan'), float('inf'), float('-inf')], None).where(pd.notnull(df.head(10)), None).to_dict(orient='records')

def _update_progress(job_id: Optional[str], progress: float, message: str) -> None:
    if not job_id:
        return
    try:
        progress_tracker.update_job(job_id, progress=progress, message=message, status="running")
    except progress_tracker.JobNotFoundError:
        logging.warning("Skipping progress update; job %s no longer tracked", job_id)


def run_preprocessing_pipeline(
    filename: str,
    steps: Optional[dict] = None,
    preprocessing: Optional[str] = None,
    full: bool = False,
    job_id: Optional[str] = None,
):
    steps = steps or {}
    _update_progress(job_id, 5, "Loading dataset from storage")
    temp_path: Optional[str] = None

    try:
        if filename.endswith('.parquet'):
            df = read_parquet_from_minio(filename)
        else:
            temp_path = _download_to_tempfile(filename)
            if filename.endswith('.csv'):
                df = pd.read_csv(temp_path)
            elif filename.endswith('.xlsx'):
                df = pd.read_excel(temp_path)
            elif filename.endswith('.json'):
                df = pd.read_json(temp_path)
            else:
                raise ValueError("Unsupported file format.")

        df = standardize_missing_indicators(df)
        if "_orig_idx" not in df.columns:
            df = df.reset_index(drop=False).rename(columns={"index": "_orig_idx"})
        _update_progress(job_id, 12, f"Dataset loaded ({len(df)} rows)")
    except Exception as exc:
        raise RuntimeError(f"Error reading file: {exc}") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    change_metadata: list[dict] = []
    df_cleaned = df.copy()
    original_row_count = len(df)

    if steps.get("removeDuplicates"):
        _update_progress(job_id, 25, "Removing duplicate rows")
        df_cleaned, meta = apply_remove_duplicates(df_cleaned, steps.get("duplicateSubset", []))
        change_metadata.append(meta)
    else:
        _update_progress(job_id, 25, "Duplicate removal skipped")

    if steps.get("removeNulls"):
        _update_progress(job_id, 35, "Removing rows with null values")
        df_cleaned, meta = apply_remove_nulls(df_cleaned, steps.get("removeNullsColumns", []))
        change_metadata.append(meta)
    else:
        _update_progress(job_id, 35, "Null-row removal skipped")

    if steps.get("fillNulls"):
        _update_progress(job_id, 45, "Filling missing values")
        df_cleaned, meta = apply_fill_nulls(df_cleaned, steps.get("fillStrategies", {}))
        if "summary" in meta:
            change_metadata.extend(meta["summary"])
        else:
            change_metadata.append(meta)
    else:
        _update_progress(job_id, 45, "No fill-null strategy requested")

    if steps.get("dropColumns"):
        _update_progress(job_id, 55, "Dropping selected columns")
        df_cleaned, meta = apply_drop_columns(df_cleaned, steps.get("dropColumns", []))
        if "summary" in meta:
            change_metadata.extend(meta["summary"])
        else:
            change_metadata.append(meta)
    else:
        _update_progress(job_id, 55, "No columns dropped")

    if steps.get("removeOutliers"):
        _update_progress(job_id, 65, "Handling statistical outliers")
        outlier_cfg = steps.get("removeOutliersConfig", {"method": "iqr", "factor": 1.5, "columns": []})
        logging.info(f"Outlier removal config: {outlier_cfg}")
        logging.info(f"DataFrame before outlier removal: {len(df_cleaned)} rows")
        df_cleaned, meta = apply_remove_outliers(df_cleaned, outlier_cfg)
        logging.info(f"DataFrame after outlier removal: {len(df_cleaned)} rows")
        logging.info(f"Outlier removal metadata: {meta}")
        if "summary" in meta:
            change_metadata.extend(meta["summary"])
        else:
            change_metadata.append(meta)
    else:
        _update_progress(job_id, 65, "Outlier handling skipped")

    _update_progress(job_id, 75, "Analyzing changes against original data")
    deleted, updated_cells = compute_diff_marks(df, df_cleaned)
    diff_truncated = False
    if len(deleted) > DIFF_ROW_LIMIT:
        deleted = deleted[:DIFF_ROW_LIMIT]
        diff_truncated = True
    if len(updated_cells) > DIFF_ROW_LIMIT:
        limited_updates = {}
        for idx in list(updated_cells.keys())[:DIFF_ROW_LIMIT]:
            limited_updates[idx] = updated_cells[idx]
        updated_cells = limited_updates
        diff_truncated = True

    _update_progress(job_id, 85, "Packaging cleaned dataset")
    try:
        df_to_save = sanitize_dataframe_for_parquet(df_cleaned)
        logging.info(f"Packaging cleaned dataset: {len(df_to_save)} rows, {len(df_to_save.columns)} columns")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df_to_save.to_parquet(tmp_file.name, engine='pyarrow', index=False)
            temp_cleaned_path = tmp_file.name
            # Verify file was written correctly
            verify_df = pd.read_parquet(temp_cleaned_path)
            logging.info(f"Verified temp file has {len(verify_df)} rows after write")
            cleaned_filename = f"cleaned_{os.path.splitext(filename)[0]}.parquet"
    except Exception as exc:
        raise RuntimeError(f"Error saving cleaned Parquet: {exc}") from exc

    _update_progress(job_id, 92, "Building preview tables")
    # Show full dataset in preview (no row limits)
    original_preview = to_preview_records(df, None)
    preview = to_preview_records(df_cleaned, None)

    full_data = None  # Full data now returned in preview
    
    _update_progress(job_id, 97, "Summarizing data quality insights")
    try:
        quality_report = analyze_data_quality(df_cleaned)
    except Exception:
        quality_report = {}

    response_payload = {
        "original_preview": original_preview,
        "preview": preview,
        "full_data": full_data,
        "diff_marks": {"deleted_row_indices": deleted, "updated_cells": updated_cells},
        "change_metadata": change_metadata,
        "quality_report": quality_report,
        "cleaned_filename": cleaned_filename,
        "temp_cleaned_path": temp_cleaned_path,
        "original_row_count": int(original_row_count),
        "cleaned_row_count": int(len(df_cleaned)),
        "preview_row_limit": None,  # No limit - showing full dataset
        "diff_truncated": diff_truncated,
        "diff_row_limit": DIFF_ROW_LIMIT,
    }

    logging.info(
        "Response payload sizes: original_preview=%s, preview=%s",
        len(original_preview),
        len(preview),
    )
    logging.info(f"Showing FULL dataset: {len(preview)} rows in preview")
    logging.info(f"Deleted row indices: {deleted}")

    return _to_json_safe(response_payload)


async def run_preprocessing_job(
    job_id: str,
    filename: str,
    steps: Optional[dict] = None,
    preprocessing: Optional[str] = None,
    full: bool = False,
):
    try:
        progress_tracker.update_job(job_id, status="running", progress=1, message="Initializing preprocessing pipeline")
    except progress_tracker.JobNotFoundError:
        logging.warning("Preprocessing job %s started but no longer tracked", job_id)

    try:
        result = await asyncio.to_thread(
            run_preprocessing_pipeline,
            filename,
            steps or {},
            preprocessing,
            full,
            job_id,
        )
        progress_tracker.complete_job(job_id, result)
    except Exception as exc:  # noqa: BLE001
        logging.exception("Preprocessing job %s failed", job_id, exc_info=True)
        try:
            progress_tracker.fail_job(job_id, str(exc))
        except progress_tracker.JobNotFoundError:
            logging.warning("Unable to mark job %s as failed; job no longer tracked", job_id)


async def data_preprocessing(
    filename: str,
    steps: Optional[dict] = None,
    preprocessing: Optional[str] = None,
    request: Optional[Request] = None,
    full: bool = False,
):
    return await asyncio.to_thread(
        run_preprocessing_pipeline,
        filename,
        steps or {},
        preprocessing,
        full,
        None,
    )

def get_data_preview(filename: str):
    try:
        # First, ensure the MinIO bucket exists before trying to access objects
        from backend.config import ensure_minio_buckets_exist
        ensure_minio_buckets_exist()
        
        response = minio_client.get_object(MINIO_BUCKET, filename)
        file_bytes_buffer = io.BytesIO(response.read())
        file_bytes_buffer.seek(0)
    except Exception as e:
        logging.error(f"Error reading file '{filename}' from MinIO: {e}", exc_info=True)
        return JSONResponse(content={"error": f"Error reading file from MinIO: {e}"}, status_code=500)

    df = None
    columns = []
    dtypes = {}
    null_counts = {}
    sample_values = {}
    cardinality = {}

    try:
        if filename.endswith('.parquet'):
            # For Parquet, use pyarrow to read schema and statistics efficiently
            parquet_file = pq.ParquetFile(file_bytes_buffer)
            schema = parquet_file.schema
            
            columns = schema.names
            dtypes = {field.name: str(field.physical_type) for field in schema}
            
            # Read FULL dataset to accurately detect all nulls (important for data validation)
            # Nulls may appear anywhere in the dataset, not just in the first 100 rows
            df = pd.read_parquet(file_bytes_buffer, engine='pyarrow')
            logging.info(f"Loaded full dataset from parquet for null detection: {len(df)} rows")
            file_bytes_buffer.seek(0) # Reset buffer for potential other uses

        elif filename.endswith('.csv'):
            df = pd.read_csv(file_bytes_buffer)  # Read full dataset
            logging.info(f"Loaded full dataset from CSV for null detection: {len(df)} rows")
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes_buffer)  # Read full dataset
            logging.info(f"Loaded full dataset from Excel for null detection: {len(df)} rows")
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes_buffer)  # Read full dataset
            logging.info(f"Loaded full dataset from JSON for null detection: {len(df)} rows")
        else:
            return JSONResponse(content={"error": "Unsupported file format for preview. Only CSV, Excel, JSON, Parquet supported."}, status_code=400)

        if df is not None:
            df = standardize_missing_indicators(df)
            columns = list(df.columns)
            dtypes = {col: str(df[col].dtype) for col in df.columns}
            null_counts = {col: int(df[col].isnull().sum()) for col in df.columns}

            def to_py(val):
                """Convert pandas/numpy scalars or array-like objects to JSON-serialisable Python values."""
                if isinstance(val, (np.ndarray, list, tuple, pd.Series)):
                    converted = [to_py(item) for item in list(val)]
                    # If every element converts to None, surface None to avoid noisy lists of nulls
                    if all(item is None for item in converted):
                        return None
                    return converted

                # Handle pandas extension types (e.g. Timestamp, NA)
                if hasattr(pd, "Timestamp") and isinstance(val, pd.Timestamp):
                    return val.isoformat()

                try:
                    if pd.isna(val):  # type: ignore[arg-type]
                        return None
                except Exception:
                    # Some objects (e.g. custom classes) may not support pd.isna; treat them as non-null
                    pass

                if isinstance(val, (np.integer, np.int64)):
                    return int(val)
                if isinstance(val, (np.floating, np.float64)):
                    return float(val)
                if isinstance(val, (np.bool_, bool)):
                    return bool(val)

                return val

            sample_values = {col: to_py(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else None for col in df.columns}
            
            # Calculate cardinality (unique values) for each column for smart encoding recommendations
            cardinality = {col: int(df[col].nunique()) for col in df.columns}

    except Exception as e:
        logging.error(f"Error loading '{filename}' into DataFrame for preview: {e}", exc_info=True)
        return JSONResponse(content={"error": f"Error loading file for preview: {e}"}, status_code=500)

    return {
        "columns": columns,
        "dtypes": dtypes,
        "null_counts": {col: int(count) for col, count in null_counts.items()},
        "sample_values": sample_values,
        "cardinality": cardinality
    }


def get_preprocessing_recommendations(filename: str):
    """Load full dataset and return preprocessing suggestions and quality summary."""
    try:
        # Ensure MinIO bucket exists and load bytes
        from backend.config import ensure_minio_buckets_exist
        ensure_minio_buckets_exist()

        response = minio_client.get_object(MINIO_BUCKET, filename)
        file_bytes_buffer = io.BytesIO(response.read())
        file_bytes_buffer.seek(0)
    except Exception as e:
        logging.error(f"Error reading file '{filename}' from MinIO for recommendations: {e}", exc_info=True)
        return JSONResponse(content={"error": f"Error reading file from MinIO: {e}"}, status_code=500)

    try:
        if filename.endswith('.parquet'):
            df = pd.read_parquet(file_bytes_buffer, engine='pyarrow')
        elif filename.endswith('.csv'):
            df = pd.read_csv(file_bytes_buffer)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes_buffer)
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes_buffer)
        else:
            return JSONResponse(content={"error": "Unsupported file format for recommendations."}, status_code=400)

        df = standardize_missing_indicators(df)
        payload = build_preprocessing_suggestions(df)
        return _to_json_safe(payload)
    except Exception as e:
        logging.error(f"Error generating preprocessing recommendations for '{filename}': {e}", exc_info=True)
        return JSONResponse(content={"error": f"Error generating recommendations: {e}"}, status_code=500)
