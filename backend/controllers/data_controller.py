# Handles data preprocessing and SQL logic
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
from .preprocessing.io_utils import read_parquet_from_minio, to_preview_records, sanitize_dataframe_for_parquet
from .preprocessing.remove_duplicates import apply as apply_remove_duplicates
from .preprocessing.remove_nulls import apply as apply_remove_nulls
from .preprocessing.fill_nulls import apply as apply_fill_nulls
from .preprocessing.drop_columns import apply as apply_drop_columns
from .preprocessing.remove_outliers import apply as apply_remove_outliers
from .preprocessing.diff_utils import compute_diff_marks
from .preprocessing.types import StepsPayload, PreprocessResult
from backend.utils.json_utils import _to_json_safe

def analyze_data_quality(df):
    """Comprehensive data quality analysis"""
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

async def data_preprocessing(filename: str, steps: dict = {}, preprocessing: str = None, request: Request = None, full: bool = False):
    # Load dataframe (prefer parquet, fallback to other formats)
    try:
        if filename.endswith('.parquet'):
            df = read_parquet_from_minio(filename)
        else:
            response = minio_client.get_object(MINIO_BUCKET, filename)
            file_bytes = io.BytesIO(response.read())
            if filename.endswith('.csv'):
                df = pd.read_csv(file_bytes)
            elif filename.endswith('.xlsx'):
                df = pd.read_excel(file_bytes)
            elif filename.endswith('.json'):
                df = pd.read_json(file_bytes)
            else:
                return JSONResponse(content={"error": "Unsupported file format."}, status_code=400)

        if "_orig_idx" not in df.columns:
            df = df.reset_index(drop=False).rename(columns={"index": "_orig_idx"})
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading file: {e}"}, status_code=500)
    
    change_metadata: list[dict] = []
    df_cleaned = df.copy()
        
    # Apply modular steps mirroring frontend
    if steps.get("removeDuplicates"):
        df_cleaned, meta = apply_remove_duplicates(df_cleaned, steps.get("duplicateSubset", []))
        change_metadata.append(meta)

    if steps.get("removeNulls"):
        df_cleaned, meta = apply_remove_nulls(df_cleaned, steps.get("removeNullsColumns", []))
        change_metadata.append(meta)

    if steps.get("fillNulls"):
        df_cleaned, meta = apply_fill_nulls(df_cleaned, steps.get("fillStrategies", {}))
        if "summary" in meta:
            change_metadata.extend(meta["summary"])
        else:
            change_metadata.append(meta)

    if steps.get("dropColumns"):
        df_cleaned, meta = apply_drop_columns(df_cleaned, steps.get("dropColumns", []))
        if "summary" in meta:
            change_metadata.extend(meta["summary"])
        else:
            change_metadata.append(meta)

    # Remove outliers step (method: iqr, factor: number, columns: list)
    if steps.get("removeOutliers"):
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

    # Compute diff marks
    deleted, updated_cells = compute_diff_marks(df, df_cleaned)

    # Save cleaned parquet to temp file
    try:
        df_to_save = sanitize_dataframe_for_parquet(df_cleaned)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df_to_save.to_parquet(tmp_file.name, engine='pyarrow', index=False)
            temp_cleaned_path = tmp_file.name
            cleaned_filename = f"cleaned_{os.path.splitext(filename)[0]}.parquet"
    except Exception as e:
        return JSONResponse(content={"error": f"Error saving cleaned Parquet: {e}"}, status_code=500)
    
    # Build previews
    if full:
        original_preview = to_preview_records(df, None)
        preview = to_preview_records(df_cleaned, None)
        full_data = preview
    else:
        original_preview = to_preview_records(df, 10)
        preview = to_preview_records(df_cleaned, 10)
        full_data = None

    # Quality report (basic)
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
    }
    
    # Debug logging
    logging.info(f"Response payload sizes: original_preview={len(original_preview)}, preview={len(preview)}, full_data={len(full_data) if full_data else 'None'}")
    logging.info(f"Deleted row indices: {deleted}")
    if original_preview:
        orig_indices = [row.get('_orig_idx') for row in original_preview[:5]]  # First 5 rows
        logging.info(f"Sample original_preview _orig_idx values: {orig_indices}")
    if preview:
        clean_indices = [row.get('_orig_idx') for row in preview[:5]]  # First 5 rows
        logging.info(f"Sample preview _orig_idx values: {clean_indices}")
    
    return _to_json_safe(response_payload)

def get_data_preview(filename: str):
    try:
        # First, ensure the MinIO bucket exists before trying to access objects
        from backend.config import ensure_minio_bucket_exists
        ensure_minio_bucket_exists()
        
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

    try:
        if filename.endswith('.parquet'):
            # For Parquet, use pyarrow to read schema and statistics efficiently
            parquet_file = pq.ParquetFile(file_bytes_buffer)
            schema = parquet_file.schema
            
            columns = schema.names
            dtypes = {field.name: str(field.physical_type) for field in schema}
            
            # To get null counts and sample values for Parquet, we might still need to read a small sample
            # Or rely on Parquet metadata if available (row group statistics), but it's not always complete for nulls.
            # For simplicity and to ensure accuracy, let's read the first few rows.
            df = pd.read_parquet(file_bytes_buffer, engine='pyarrow')
            df = df.head(100)  # Limit to first 100 rows for preview
            file_bytes_buffer.seek(0) # Reset buffer for potential other uses

        elif filename.endswith('.csv'):
            df = pd.read_csv(file_bytes_buffer, nrows=100) # Read only first 100 rows
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes_buffer, nrows=100) # Read only first 100 rows
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes_buffer, nrows=100) # Read only first 100 rows
        else:
            return JSONResponse(content={"error": "Unsupported file format for preview. Only CSV, Excel, JSON, Parquet supported."}, status_code=400)

        if df is not None:
            columns = list(df.columns)
            dtypes = {col: str(df[col].dtype) for col in df.columns}
            null_counts = {col: int(df[col].isnull().sum()) for col in df.columns}

            def to_py(val):
                if pd.isna(val):
                    return None
                if isinstance(val, (np.integer, np.int64)):
                    return int(val)
                if isinstance(val, (np.floating, np.float64)):
                    return float(val)
                return val

            sample_values = {col: to_py(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else None for col in df.columns}

    except Exception as e:
        logging.error(f"Error loading '{filename}' into DataFrame for preview: {e}", exc_info=True)
        return JSONResponse(content={"error": f"Error loading file for preview: {e}"}, status_code=500)

    return {
        "columns": columns,
        "dtypes": dtypes,
        "null_counts": {col: int(count) for col, count in null_counts.items()},
        "sample_values": sample_values
    }
