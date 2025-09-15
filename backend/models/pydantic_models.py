# Pydantic request/response models for API endpoints
from typing import Optional
from pydantic import BaseModel

class UploadFromURLRequest(BaseModel):
    url: str
    filename: Optional[str] = None

class UploadFromGoogleDriveRequest(BaseModel):
    file_id: str
    access_token: str
    filename: Optional[str] = None

class SQLWorkbenchRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str
    query: str
    filename: Optional[str] = None

class SQLConnectRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
