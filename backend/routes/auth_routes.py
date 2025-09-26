# FastAPI route definitions for authentication endpoints
from fastapi import APIRouter, Request
from backend.controllers import auth_controller
from backend.models.pydantic_models import AuthRegisterRequest, AuthLoginRequest

router = APIRouter()

@router.get("/auth/google/login")
def google_login(prompt: str | None = None):
    return auth_controller.google_login(prompt)

@router.get("/auth/google/callback")
async def google_callback(code: str, request: Request):
    return await auth_controller.google_callback(code, request)


@router.post("/auth/register")
async def register_user(payload: AuthRegisterRequest):
    return await auth_controller.register_user(payload)


@router.post("/auth/login")
async def login_user(payload: AuthLoginRequest):
    return await auth_controller.login_user(payload)


@router.post("/auth/refresh")
async def refresh_access_token(request: Request):
    return await auth_controller.refresh_access_token(request)


@router.get("/auth/me")
async def get_me(request: Request):
    return await auth_controller.get_me(request)


@router.post("/auth/logout")
async def logout_user():
    return await auth_controller.logout_user()


@router.delete("/auth/account")
async def delete_account(request: Request):
    return await auth_controller.delete_account(request)
