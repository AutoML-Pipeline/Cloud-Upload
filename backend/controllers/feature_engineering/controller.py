import io
import logging
import pandas as pd
from typing import Dict, Any, List

from backend.config import MINIO_BUCKET, CLEANED_BUCKET, minio_client
from backend.controllers.feature_engineering.types import (
    ApplyFeatureEngineeringRequest, FeatureEngineeringPreviewRequest, FeatureEngineeringResponse, MinioFile,
    ScalingConfig, EncodingConfig, BinningConfig, FeatureCreationConfig, FeatureSelectionConfig, FeatureEngineeringSummary
)
from backend.controllers.feature_engineering.operations import (
    apply_scaling,
    apply_encoding,
    apply_binning,
    apply_feature_creation,
    apply_feature_selection,  # fixed name
)


async def get_minio_files_for_feature_engineering() -> List[MinioFile]:
    files: List[MinioFile] = []
    try:
        # List from CLEANED_BUCKET root
        objects = minio_client.list_objects(CLEANED_BUCKET, recursive=True)
        for obj in objects:
            if getattr(obj, "is_dir", False):
                continue
            files.append(MinioFile(
                name=obj.object_name,
                last_modified=getattr(obj, "last_modified", None).isoformat() if getattr(obj, "last_modified", None) else None,
                size=getattr(obj, "size", 0),
            ))
    except Exception as e:
        logging.exception("Failed to list cleaned-data files from MinIO")
        raise
    return files


def _load_dataframe_from_minio(filename: str, bucket_name: str) -> pd.DataFrame:
    response = minio_client.get_object(bucket_name, filename)
    data = io.BytesIO(response.read())
    if filename.endswith('.parquet'):
        return pd.read_parquet(data, engine='pyarrow')
    elif filename.endswith('.csv'):
        return pd.read_csv(data)
    elif filename.endswith('.xlsx'):
        return pd.read_excel(data)
    elif filename.endswith('.json'):
        return pd.read_json(data)
    else:
        raise ValueError("Unsupported file format")


def _to_preview(df: pd.DataFrame) -> list[dict]:
    # Convert DataFrame to a list of dictionaries, handling non-finite values
    df = df.replace([float('inf'), float('-inf')], pd.NA)
    df = df.where(pd.notna(df), None)
    return df.head(100).to_dict(orient='list')


def _filter_ml_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Filter out columns that are not suitable for feature engineering"""
    # Columns to exclude from feature engineering
    exclude_columns = {
        '_orig_idx',  # Index column
        'customer_id',  # ID column
        'id',  # Generic ID column
        'index',  # Index column
        'row_id',  # Row identifier
        'uuid',  # UUID column
        'key',  # Key column
    }
    
    # Get columns that are suitable for ML
    ml_columns = [col for col in df.columns if col.lower() not in exclude_columns]
    
    # If no ML columns found, return original dataframe
    if not ml_columns:
        return df
    
    return df[ml_columns]

async def get_feature_engineering_preview(request: FeatureEngineeringPreviewRequest) -> FeatureEngineeringResponse:
    try:
        df = _load_dataframe_from_minio(request.filename, CLEANED_BUCKET) # Use CLEANED_BUCKET
        
        # If no steps are provided (initial load), filter to ML-suitable columns only
        if not request.steps or request.current_step_index < 0:
            original_columns = set(df.columns)
            df = _filter_ml_columns(df)
            filtered_columns = original_columns - set(df.columns)
            
            message = "Preview generated successfully"
            if filtered_columns:
                message += f" (Filtered out {len(filtered_columns)} non-ML columns: {', '.join(sorted(filtered_columns))})"
            
            return FeatureEngineeringResponse(
                preview=_to_preview(df),
                change_metadata=[],
                message=message
            )
        
        processed_df = df.copy()
        change_metadata = []
        
        # Collect all columns that are used in feature engineering steps
        used_columns = set()
        for step_config in request.steps:
            if hasattr(step_config, 'columns') and step_config.columns:
                used_columns.update(step_config.columns)

        for i, step_config in enumerate(request.steps):
            if i > request.current_step_index:
                break # Only apply up to the current step for preview

            if step_config.type == "scaling":
                config: ScalingConfig = step_config
                processed_df, meta = apply_scaling(processed_df, config.columns, config.method)
            elif step_config.type == "encoding":
                config: EncodingConfig = step_config
                processed_df, meta = apply_encoding(processed_df, config.columns, config.method)
            elif step_config.type == "binning":
                config: BinningConfig = step_config
                processed_df, meta = apply_binning(processed_df, config.columns, config.method, config.bins)
            elif step_config.type == "feature_creation":
                config: FeatureCreationConfig = step_config
                processed_df, meta = apply_feature_creation(
                    processed_df,
                    config.columns,
                    config.method,
                    degree=config.degree,
                    date_part=config.date_part,
                    aggregation_type=config.aggregation_type,
                    new_column_name=config.new_column_name
                )
            elif step_config.type == "feature_selection":
                config: FeatureSelectionConfig = step_config
                processed_df, meta = apply_feature_selection(
                    processed_df,
                    config.columns,
                    config.method,
                    threshold=config.threshold,
                    n_components=config.n_components
                )
            else:
                continue # Skip unknown step types
            change_metadata.append(FeatureEngineeringSummary(**meta))

        # When applying feature engineering, show all columns including changes
        return FeatureEngineeringResponse(
            preview=_to_preview(processed_df),
            change_metadata=change_metadata,
            message="Preview generated successfully"
        )
    except Exception as e:
        logging.exception("Feature engineering preview failed")
        return FeatureEngineeringResponse(
            preview={}, # Return empty preview on error
            change_metadata=[],
            message=f"Error generating preview: {e}"
        )

async def apply_and_save_feature_engineering(request: ApplyFeatureEngineeringRequest) -> Dict[str, str]:
    try:
        df = _load_dataframe_from_minio(request.filename, CLEANED_BUCKET) # Use CLEANED_BUCKET
        
        processed_df = df.copy()
        change_metadata = [] # Not used for saving, but good to keep track
        
        # Collect all columns that are used in feature engineering steps
        used_columns = set()
        for step_config in request.steps:
            if hasattr(step_config, 'columns') and step_config.columns:
                used_columns.update(step_config.columns)

        for step_config in request.steps:
            if step_config.type == "scaling":
                config: ScalingConfig = step_config
                processed_df, meta = apply_scaling(processed_df, config.columns, config.method)
            elif step_config.type == "encoding":
                config: EncodingConfig = step_config
                processed_df, meta = apply_encoding(processed_df, config.columns, config.method)
            elif step_config.type == "binning":
                config: BinningConfig = step_config
                processed_df, meta = apply_binning(processed_df, config.columns, config.method, config.bins)
            elif step_config.type == "feature_creation":
                config: FeatureCreationConfig = step_config
                processed_df, meta = apply_feature_creation(
                    processed_df,
                    config.columns,
                    config.method,
                    degree=config.degree,
                    date_part=config.date_part,
                    aggregation_type=config.aggregation_type,
                    new_column_name=config.new_column_name
                )
            elif step_config.type == "feature_selection":
                config: FeatureSelectionConfig = step_config
                processed_df, meta = apply_feature_selection(
                    processed_df,
                    config.columns,
                    config.method,
                    threshold=config.threshold,
                    n_components=config.n_components
                )
            else:
                continue
            change_metadata.append(FeatureEngineeringSummary(**meta)) # Keep track of changes

        # When saving, keep all columns including changes (no filtering)

        # Save to MinIO
        engineered_filename = f"engineered/{request.filename.replace('cleaned-data/', '')}" # Ensure correct path
        
        # Convert to parquet in-memory and upload
        parquet_buffer = io.BytesIO()
        processed_df.to_parquet(parquet_buffer, index=False)
        parquet_buffer.seek(0)

        minio_client.put_object(
            MINIO_BUCKET, # Use the main bucket for 'engineered' folder
            engineered_filename,
            parquet_buffer,
            len(parquet_buffer.getvalue()),
            content_type="application/octet-stream"
        )
        return {"message": f"Engineered data saved to {engineered_filename} in MinIO."}
    except Exception as e:
        logging.exception("Apply and save feature engineering failed")
        return {"error": f"Error applying and saving feature engineering: {e}"}

