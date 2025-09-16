import pandas as pd
import numpy as np
import tempfile
import os
import io
import json
import logging
from typing import Dict, List, Any, Optional
from fastapi import Request
from fastapi.responses import JSONResponse

from config import minio_client, MINIO_BUCKET
from .operations import (
    apply_scaling, apply_encoding, apply_binning, 
    apply_feature_creation, apply_feature_selection, get_feature_info
)
from .types import (
    FeatureEngineeringPayload, FeatureEngineeringResult, FeatureEngineeringStep,
    ScalingConfig, EncodingConfig, BinningConfig, FeatureCreationConfig, FeatureSelectionConfig
)
from ..preprocessing.io_utils import read_parquet_from_minio, to_preview_records, sanitize_dataframe_for_parquet

def _to_json_safe(value):
    """Convert values to JSON-safe format"""
    if value is None:
        return None
    # pandas NA
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    # numpy scalars
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        f = float(value)
        if np.isnan(f) or np.isinf(f):
            return None
        return f
    if isinstance(value, (np.bool_,)):
        return bool(value)
    # python floats
    if isinstance(value, float):
        if np.isnan(value) or np.isinf(value):
            return None
        return value
    # containers
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_json_safe(v) for v in value]
    return value

async def apply_feature_engineering(filename: str, payload: FeatureEngineeringPayload, request: Request = None) -> Dict[str, Any]:
    """Apply feature engineering transformations to a dataset"""
    
    # Load dataframe from cleaned-data bucket
    try:
        # Use cleaned-data bucket for feature engineering
        cleaned_bucket = "cleaned-data"
        
        if filename.endswith('.parquet'):
            # Read parquet from cleaned-data bucket
            response = minio_client.get_object(cleaned_bucket, filename)
            file_bytes = io.BytesIO(response.read())
            df = pd.read_parquet(file_bytes, engine='pyarrow')
        else:
            response = minio_client.get_object(cleaned_bucket, filename)
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
    
    # Get original feature info
    original_feature_info = get_feature_info(df)
    
    # Apply feature engineering steps
    df_engineered = df.copy()
    step_results = []
    
    for step in payload.get('steps', []):
        step_id = step.get('step_id', f"step_{len(step_results)}")
        operation = step.get('operation')
        config = step.get('config', {})
        
        try:
            if operation == 'scaling':
                df_engineered, metadata = apply_scaling(df_engineered, config)
            elif operation == 'encoding':
                df_engineered, metadata = apply_encoding(df_engineered, config)
            elif operation == 'binning':
                df_engineered, metadata = apply_binning(df_engineered, config)
            elif operation == 'feature_creation':
                df_engineered, metadata = apply_feature_creation(df_engineered, config)
            elif operation == 'feature_selection':
                df_engineered, metadata = apply_feature_selection(df_engineered, config)
            else:
                metadata = {
                    'operation': operation,
                    'summary': [f"Unknown operation: {operation}"]
                }
            
            step_results.append({
                'step_id': step_id,
                'operation': operation,
                'config': config,
                'metadata': metadata
            })
            
        except Exception as e:
            logging.error(f"Error in step {step_id}: {e}")
            step_results.append({
                'step_id': step_id,
                'operation': operation,
                'config': config,
                'metadata': {
                    'operation': operation,
                    'summary': [f"Error: {str(e)}"]
                }
            })
    
    # Get engineered feature info
    engineered_feature_info = get_feature_info(df_engineered)
    
    # Save engineered parquet to temp file
    try:
        df_to_save = sanitize_dataframe_for_parquet(df_engineered)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df_to_save.to_parquet(tmp_file.name, engine='pyarrow', index=False)
            temp_engineered_path = tmp_file.name
            engineered_filename = f"engineered_{os.path.splitext(filename)[0]}.parquet"
    except Exception as e:
        return JSONResponse(content={"error": f"Error saving engineered Parquet: {e}"}, status_code=500)
    
    # Build previews
    full_flag = (request and hasattr(request, 'query_params') and request.query_params.get('full') == 'true')
    if full_flag:
        original_preview = to_preview_records(df, None)
        preview = to_preview_records(df_engineered, None)
        full_data = preview
    else:
        original_preview = to_preview_records(df, 10)
        preview = to_preview_records(df_engineered, 10)
        full_data = None
    
    # Prepare response
    response_payload = {
        "original_preview": original_preview,
        "preview": preview,
        "full_data": full_data,
        "feature_info": {
            "original": original_feature_info,
            "engineered": engineered_feature_info
        },
        "step_results": step_results,
        "engineered_filename": engineered_filename,
        "temp_engineered_path": temp_engineered_path,
    }
    
    return _to_json_safe(response_payload)

def get_feature_engineering_preview(filename: str) -> Dict[str, Any]:
    """Get preview information for feature engineering"""
    try:
        # Load dataframe from cleaned-data bucket
        cleaned_bucket = "cleaned-data"
        
        if filename.endswith('.parquet'):
            # Read parquet from cleaned-data bucket
            response = minio_client.get_object(cleaned_bucket, filename)
            file_bytes = io.BytesIO(response.read())
            df = pd.read_parquet(file_bytes, engine='pyarrow')
            # Limit to 100 rows for preview
            df = df.head(100)
        else:
            response = minio_client.get_object(cleaned_bucket, filename)
            file_bytes = io.BytesIO(response.read())
            if filename.endswith('.csv'):
                df = pd.read_csv(file_bytes, nrows=100)
            elif filename.endswith('.xlsx'):
                df = pd.read_excel(file_bytes, nrows=100)
            elif filename.endswith('.json'):
                df = pd.read_json(file_bytes, nrows=100)
            else:
                return JSONResponse(content={"error": "Unsupported file format."}, status_code=400)
        
        # Get feature information
        feature_info = get_feature_info(df)
        
        # Get column information
        columns = list(df.columns)
        dtypes = {col: str(df[col].dtype) for col in df.columns}
        null_counts = {col: int(df[col].isnull().sum()) for col in df.columns}
        
        # Sample values
        def to_py(val):
            if pd.isna(val):
                return None
            if isinstance(val, (np.integer, np.int64)):
                return int(val)
            if isinstance(val, (np.floating, np.float64)):
                return float(val)
            return val
        
        sample_values = {col: to_py(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else None for col in df.columns}
        
        return {
            "columns": columns,
            "dtypes": dtypes,
            "null_counts": null_counts,
            "sample_values": sample_values,
            "feature_info": feature_info
        }
        
    except Exception as e:
        logging.error(f"Error getting feature engineering preview for {filename}: {e}")
        return JSONResponse(content={"error": f"Error loading file for preview: {e}"}, status_code=500)
