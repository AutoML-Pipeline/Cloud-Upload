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
from config import minio_client, MINIO_BUCKET
import tempfile
import os
import io
import json
from fastapi import Request

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
            
            quality_report['outliers'][col] = {
                'count': int(len(outliers)),
                'percentage': float((len(outliers) / len(df)) * 100),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound)
            }
    
    # Calculate quality score
    missing_penalty = sum(info['percentage'] for info in quality_report['missing_data'].values()) * 0.5
    duplicate_penalty = (quality_report['duplicate_rows'] / quality_report['total_rows']) * 100
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

async def data_preprocessing(filename: str, steps: dict = {}, preprocessing: str = None, request: Request = None):
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        file_bytes = io.BytesIO(response.read())
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading file from MinIO: {e}"}, status_code=500)
    
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_bytes)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes)
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes)
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(file_bytes)
        else:
            return JSONResponse(content={"error": "Unsupported file format."}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Error loading file into DataFrame: {e}"}, status_code=500)
    
    original_preview = get_original_preview(df)
    change_metadata = []
    df_cleaned = df.copy()
        
    # --- Manual Preprocessing Steps ---
    # Remove duplicates (advanced: allow subset)
    if steps.get("removeDuplicates"):
        subset = steps.get("duplicateSubset", None)
        before = len(df_cleaned)
        if subset and isinstance(subset, list) and len(subset) > 0:
            df_cleaned = df_cleaned.drop_duplicates(subset=subset)
            after = len(df_cleaned)
            change_metadata.append(f"Removed {before - after} duplicate rows based on columns: {', '.join(subset)}.")
        else:
            df_cleaned = df_cleaned.drop_duplicates()
            after = len(df_cleaned)
            change_metadata.append(f"Removed {before - after} duplicate rows (all columns).")

    # Remove nulls
    if steps.get("removeNulls"):
        before = len(df_cleaned)
        df_cleaned = df_cleaned.dropna()
        after = len(df_cleaned)
        change_metadata.append(f"Removed {before - after} rows with nulls.")

    # Fill nulls (per-column strategies)
    fill_strategies = steps.get("fillStrategies", {})
    if steps.get("fillNulls") and fill_strategies:
        for col, strat in fill_strategies.items():
            strategy = strat.get("strategy", "skip")
            if strategy == "skip":
                continue
            if col not in df_cleaned.columns:
                continue
            if strategy == "mean" and pd.api.types.is_numeric_dtype(df_cleaned[col]):
                df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].mean())
            elif strategy == "median" and pd.api.types.is_numeric_dtype(df_cleaned[col]):
                df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].median())
            elif strategy == "mode":
                mode_val = df_cleaned[col].mode()
                if not mode_val.empty:
                    df_cleaned[col] = df_cleaned[col].fillna(mode_val[0])
                else:
                    df_cleaned[col] = df_cleaned[col].fillna("Unknown")
            elif strategy == "zero":
                df_cleaned[col] = df_cleaned[col].fillna(0)
            elif strategy == "custom":
                custom_val = strat.get("value", "")
                df_cleaned[col] = df_cleaned[col].fillna(custom_val)
            else:
                # Fallback: use mode for categorical, zero for numeric
                if pd.api.types.is_numeric_dtype(df_cleaned[col]):
                    df_cleaned[col] = df_cleaned[col].fillna(0)
                else:
                    mode_val = df_cleaned[col].mode()
                    if not mode_val.empty:
                        df_cleaned[col] = df_cleaned[col].fillna(mode_val[0])
                    else:
                        df_cleaned[col] = df_cleaned[col].fillna("Unknown")
        change_metadata.append("Filled nulls per column strategies.")
    elif steps.get("fillNulls"):
        # fallback: old logic (single strategy for all columns)
        strategy = steps.get("fillStrategy", "mean")
        for col in df_cleaned.columns:
            if df_cleaned[col].isnull().any():
                if strategy == "mean" and pd.api.types.is_numeric_dtype(df_cleaned[col]):
                    df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].mean())
                elif strategy == "median" and pd.api.types.is_numeric_dtype(df_cleaned[col]):
                    df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].median())
                elif strategy == "mode":
                    mode_val = df_cleaned[col].mode()
                    if not mode_val.empty:
                        df_cleaned[col] = df_cleaned[col].fillna(mode_val[0])
                elif strategy == "zero":
                    df_cleaned[col] = df_cleaned[col].fillna(0)
                elif strategy == "custom":
                    custom_val = steps.get("customFillValue", "")
                    df_cleaned[col] = df_cleaned[col].fillna(custom_val)
        change_metadata.append(f"Filled nulls using {strategy} strategy.")

    # Drop columns
    drop_cols = steps.get("dropColumns", [])
    if drop_cols:
        df_cleaned = df_cleaned.drop(columns=drop_cols, errors="ignore")
        change_metadata.append(f"Dropped columns: {', '.join(drop_cols)}.")

    # Encode categorical
    encode_cols = steps.get("encodeCategorical", [])
    encoding_method = steps.get("encodingMethod", "onehot")
    if encode_cols:
        if encoding_method == "onehot":
            df_cleaned = pd.get_dummies(df_cleaned, columns=encode_cols, drop_first=True)
            change_metadata.append(f"One-hot encoded columns: {', '.join(encode_cols)}.")
        elif encoding_method == "label":
            from sklearn.preprocessing import LabelEncoder
            for col in encode_cols:
                le = LabelEncoder()
                df_cleaned[col] = le.fit_transform(df_cleaned[col].astype(str))
            change_metadata.append(f"Label encoded columns: {', '.join(encode_cols)}.")

    # Scale numeric
    scale_cols = steps.get("scaleNumeric", [])
    scaling_method = steps.get("scalingMethod", "minmax")
    if scale_cols:
        if scaling_method == "minmax":
            from sklearn.preprocessing import MinMaxScaler
            scaler = MinMaxScaler()
        elif scaling_method == "standard":
            from sklearn.preprocessing import StandardScaler
            scaler = StandardScaler()
        else:
            scaler = None
        if scaler:
            for col in scale_cols:
                # Don't scale ID or AGE columns
                if col.lower() in ["id", "age"]:
                    continue
                df_cleaned[col] = scaler.fit_transform(df_cleaned[[col]])
            change_metadata.append(f"Scaled columns: {', '.join(scale_cols)} using {scaling_method}.")

    # Outlier removal
    outlier_cols = steps.get("outlierColumns", [])
    outlier_method = steps.get("outlierMethod", "iqr")
    if outlier_cols:
        for col in outlier_cols:
            if outlier_method == "iqr":
                Q1 = df_cleaned[col].quantile(0.25)
                Q3 = df_cleaned[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
                before = len(df_cleaned)
                df_cleaned = df_cleaned[(df_cleaned[col] >= lower) & (df_cleaned[col] <= upper)]
                after = len(df_cleaned)
                change_metadata.append(f"Removed {before - after} outliers from {col} (IQR).")
            elif outlier_method == "zscore":
                mean = df_cleaned[col].mean()
                std = df_cleaned[col].std()
                before = len(df_cleaned)
                df_cleaned = df_cleaned[(np.abs((df_cleaned[col] - mean) / std) < 3)]
                after = len(df_cleaned)
                change_metadata.append(f"Removed {before - after} outliers from {col} (Z-score).")

    # Reorder columns
    reorder_cols = steps.get("reorderColumns", [])
    if reorder_cols and set(reorder_cols) == set(df_cleaned.columns):
        df_cleaned = df_cleaned[reorder_cols]
        change_metadata.append("Reordered columns.")

    # --- End Manual Steps ---

    # Save cleaned file and prepare preview
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            df_cleaned.to_parquet(tmp_file.name, engine='pyarrow')
            tmp_file.seek(0)
            temp_cleaned_path = tmp_file.name
            cleaned_filename = f"cleaned_{os.path.splitext(filename)[0]}.parquet"
    except Exception as e:
        return JSONResponse(content={"error": f"Error saving cleaned Parquet: {e}"}, status_code=500)
    
    try:
        with open(temp_cleaned_path, 'rb') as f:
            cleaned_df = pd.read_parquet(f, engine='pyarrow')
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading cleaned Parquet from temp file: {e}"}, status_code=500)
    
    preview = get_original_preview(cleaned_df)
    dtypes_table = [{"column": col, "dtype": str(dtype)} for col, dtype in cleaned_df.dtypes.items()]
    nulls_table = [{"column": col, "null_count": int(nulls) if pd.notnull(nulls) and not pd.isna(nulls) else 0} for col, nulls in cleaned_df.isnull().sum().items()]
    
    # Check for ?full=true
    full_data = None
    if request and hasattr(request, 'query_params') and request.query_params.get('full') == 'true':
        full_data = cleaned_df.replace([float('nan'), float('inf'), float('-inf')], None).where(pd.notnull(cleaned_df), None).to_dict(orient='records')
    return {
        "original_preview": original_preview,
        "preview": preview, 
        "full_data": full_data,
        "dtypes_table": dtypes_table, 
        "nulls_table": nulls_table, 
        "cleaned_filename": cleaned_filename, 
        "temp_cleaned_path": temp_cleaned_path,
        "change_metadata": change_metadata,
        # ... (add quality reports, summaries as needed)
    }

def get_data_preview(filename: str):
    try:
        response = minio_client.get_object(MINIO_BUCKET, filename)
        file_bytes = io.BytesIO(response.read())
    except Exception as e:
        return JSONResponse(content={"error": f"Error reading file from MinIO: {e}"}, status_code=500)
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_bytes)
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(file_bytes)
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes)
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(file_bytes)
        else:
            return JSONResponse(content={"error": "Unsupported file format."}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Error loading file into DataFrame: {e}"}, status_code=500)
    columns = list(df.columns)
    dtypes = {col: str(df[col].dtype) for col in df.columns}
    null_counts = {col: int(df[col].isnull().sum()) for col in df.columns}
    def to_py(val):
        if hasattr(val, 'item'):
            return val.item()
        return val
    sample_values = {col: to_py(df[col].dropna().iloc[0]) if df[col].dropna().shape[0] > 0 else None for col in df.columns}
    return {
        "columns": columns,
        "dtypes": dtypes,
        "null_counts": {col: int(count) for col, count in null_counts.items()},
        "sample_values": sample_values
    }


