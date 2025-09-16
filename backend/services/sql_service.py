from fastapi.responses import JSONResponse
from models.pydantic_models import SQLWorkbenchRequest, SQLConnectRequest
import pymysql
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import os
import tempfile
import logging

from services import minio_service
from config import MINIO_BUCKET

async def sql_preview(request: SQLWorkbenchRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password,
            database=request.database
        )
        with conn.cursor() as cursor:
            cursor.execute(request.query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchmany(20)
        conn.close()
        preview = [dict(zip(columns, row)) for row in rows]
        return {"preview": preview}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

async def upload_from_sql(request: SQLWorkbenchRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password,
            database=request.database
        )
        with conn.cursor() as cursor:
            cursor.execute(request.query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
        conn.close()
        df = pd.DataFrame(rows, columns=columns)
        table = pa.Table.from_pandas(df)

        minio_service.ensure_bucket_exists(MINIO_BUCKET)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmpfile:
            pq.write_table(table, tmpfile.name)
            tmpfile_path = tmpfile.name
        
        filename_to_use = request.filename if request.filename else f"sql_upload_{os.path.basename(tmpfile_path)}.parquet"

        if not filename_to_use.lower().endswith('.parquet'):
            filename_to_use += '.parquet'

        logging.info(f"Attempting to upload {filename_to_use} from {tmpfile_path} to MinIO bucket {MINIO_BUCKET}")
        minio_service.upload_object(
            MINIO_BUCKET,
            filename_to_use,
            tmpfile_path,
            length=os.path.getsize(tmpfile_path)
        )
        logging.info(f"Successfully uploaded {filename_to_use} to MinIO.")
        os.remove(tmpfile_path)
        return {"message": f"Data uploaded to MinIO as {filename_to_use}", "filename": filename_to_use}
    except Exception as e:
        logging.error(f"Error during SQL upload: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": f"Error during SQL upload: {str(e)}"})

async def sql_list_databases(request: SQLConnectRequest):
    try:
        conn = pymysql.connect(
            host=request.host,
            port=int(request.port),
            user=request.user,
            password=request.password
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES")
            dbs = [row[0] for row in cursor.fetchall()]
        conn.close()
        return {"databases": dbs}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
