# Handles data preprocessing and SQL logic
from fastapi import Form
from fastapi.responses import JSONResponse
import pandas as pd

# TODO: Move sql_preview, sql_list_databases here from main.py

# Handles data preprocessing logic
from config import minio_client, MINIO_BUCKET
import tempfile
import os
import io
import json
from sklearn.preprocessing import StandardScaler, MinMaxScaler

async def data_preprocessing(filename: str, steps: list[str] = [], preprocessing: str = None):
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
    pre_steps = {}
    if preprocessing:
        try:
            pre_steps = json.loads(preprocessing)
        except Exception as e:
            return JSONResponse(content={"error": f"Invalid preprocessing options: {e}"}, status_code=400)
    try:
        if pre_steps.get('drop_nulls', {}).get('enabled'):
            df.dropna(inplace=True)
        if pre_steps.get('fill_nulls', {}).get('enabled'):
            df.fillna(0, inplace=True)
        if pre_steps.get('remove_duplicates', {}).get('enabled'):
            df.drop_duplicates(inplace=True)
        if pre_steps.get('impute_missing', {}).get('enabled'):
            strategy = pre_steps['impute_missing'].get('strategy', 'mean')
            if strategy == 'mean':
                df.fillna(df.mean(numeric_only=True), inplace=True)
            elif strategy == 'median':
                df.fillna(df.median(numeric_only=True), inplace=True)
            elif strategy == 'mode':
                df.fillna(df.mode().iloc[0], inplace=True)
            elif strategy == 'constant':
                constant = pre_steps['impute_missing'].get('constant', 0)
                df.fillna(constant, inplace=True)
        if pre_steps.get('one_hot', {}).get('enabled'):
            cat_cols = df.select_dtypes(include=['object', 'category']).columns
            df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
        if pre_steps.get('scaling', {}).get('enabled'):
            method = pre_steps['scaling'].get('method', 'standard')
            num_cols = df.select_dtypes(include=['number']).columns
            if method == 'standard':
                scaler = StandardScaler()
            else:
                scaler = MinMaxScaler()
            df[num_cols] = scaler.fit_transform(df[num_cols])
        if pre_steps.get('remove_outliers', {}).get('enabled'):
            method = pre_steps['remove_outliers'].get('method', 'iqr')
            num_cols = df.select_dtypes(include=['number']).columns
            if method == 'iqr':
                Q1 = df[num_cols].quantile(0.25)
                Q3 = df[num_cols].quantile(0.75)
                IQR = Q3 - Q1
                mask = ~((df[num_cols] < (Q1 - 1.5 * IQR)) | (df[num_cols] > (Q3 + 1.5 * IQR))).any(axis=1)
                if not pre_steps['remove_outliers'].get('preview'):
                    df = df[mask]
            elif method == 'zscore':
                from scipy.stats import zscore
                z_scores = df[num_cols].apply(zscore)
                mask = (z_scores.abs() < 3).all(axis=1)
                if not pre_steps['remove_outliers'].get('preview'):
                    df = df[mask]
    except Exception as e:
        return JSONResponse(content={"error": f"Error during preprocessing: {e}"}, status_code=500)
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp_file:
            for col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col])
                except:
                    df[col] = df[col].astype(str)
            df.to_parquet(tmp_file.name, engine='pyarrow')
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
    preview = cleaned_df.head(10).replace([float('nan'), float('inf'), float('-inf')], None).where(pd.notnull(cleaned_df.head(10)), None).to_dict(orient='records')
    dtypes_table = [{"column": col, "dtype": str(dtype)} for col, dtype in cleaned_df.dtypes.items()]
    nulls_table = [{"column": col, "null_count": int(nulls) if pd.notnull(nulls) and not pd.isna(nulls) else 0} for col, nulls in cleaned_df.isnull().sum().items()]
    return {"preview": preview, "dtypes_table": dtypes_table, "nulls_table": nulls_table, "cleaned_filename": cleaned_filename, "temp_cleaned_path": temp_cleaned_path}
