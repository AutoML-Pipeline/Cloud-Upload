# FastAPI route definitions for authentication endpoints
from fastapi import APIRouter, Request
from controllers import auth_controller

router = APIRouter()

@router.get("/auth/google/login")
def google_login():
    return auth_controller.google_login()

@router.get("/auth/google/callback")
async def google_callback(code: str, request: Request):
    return await auth_controller.google_callback(code, request)
