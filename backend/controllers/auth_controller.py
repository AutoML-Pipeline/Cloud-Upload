# Handles user upsert and OAuth logic for Google, OneDrive, Box
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from backend.config import users_collection
import os
import json
import warnings
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from backend.models.pydantic_models import (
    UploadFromGoogleDriveRequest,
    AuthRegisterRequest,
    AuthLoginRequest,
)

import logging
logging.basicConfig(level=logging.INFO)

def log_env_vars():
    logging.info(f"GOOGLE_OAUTH_CLIENT_ID: {os.getenv('GOOGLE_OAUTH_CLIENT_ID')}")
    logging.info(f"GOOGLE_OAUTH_CLIENT_SECRET: {os.getenv('GOOGLE_OAUTH_CLIENT_SECRET')}")
    logging.info(f"GOOGLE_OAUTH_REDIRECT_URI: {os.getenv('GOOGLE_OAUTH_REDIRECT_URI')}")
    logging.info(f"GOOGLE_OAUTH_PROJECT_ID: {os.getenv('GOOGLE_OAUTH_PROJECT_ID')}")

log_env_vars()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte limit; proactively guard to avoid runtime errors
    if isinstance(password, str) and len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long; must be <= 72 bytes")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


def create_access_token(subject: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = subject.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(subject: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = subject.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "typ": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def sanitize_user_doc(doc: dict | None) -> dict:
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "email": doc.get("email"),
        "name": doc.get("name"),
        "picture": doc.get("picture"),
        "google_id": doc.get("google_id"),
        "provider": doc.get("provider", "local"),
    }

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
GOOGLE_OAUTH_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "project_id": os.getenv("GOOGLE_OAUTH_PROJECT_ID", ""),
        "auth_uri": os.getenv("GOOGLE_OAUTH_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
        "token_uri": os.getenv("GOOGLE_OAUTH_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.getenv("GOOGLE_OAUTH_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uris": [GOOGLE_REDIRECT_URI]
    }
}
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.readonly"
]

async def upsert_google_user(google_id, email, name, picture=None):
    if users_collection is None:
        # If Mongo is not configured, operate in no-op mode
        return {
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture,
            "provider": "google",
            "note": "users_collection not configured; skipped DB write"
        }
    user_doc = {
        "google_id": google_id,
        "email": email,
        "name": name,
        "picture": picture,
        "provider": "google",
        "updated_at": datetime.utcnow(),
    }
    await users_collection.update_one(
        {"google_id": google_id},
        {"$set": user_doc},
        upsert=True
    )
    doc = await users_collection.find_one({"google_id": google_id})
    return doc or user_doc

def google_login(prompt: str | None = None):
    flow = Flow.from_client_config(
        GOOGLE_OAUTH_CONFIG,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt=prompt or 'select_account'
    )
    # Use 302 for typical OAuth redirects to avoid confusing 307 logs
    return RedirectResponse(auth_url, status_code=302)

async def google_callback(code: str, request: Request):
    try:
        flow = Flow.from_client_config(
            GOOGLE_OAUTH_CONFIG,
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        # Suppress noisy warnings during token fetch
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)

        creds = flow.credentials

        # Disable discovery cache to avoid cache-related warnings
        oauth2_service = build('oauth2', 'v2', credentials=creds, cache_discovery=False)
        user_info = oauth2_service.userinfo().get().execute()

        mongo_user = await upsert_google_user(
            user_info.get('id'),
            user_info.get('email'),
            user_info.get('name', ''),
            user_info.get('picture')
        )

        sanitized_user = sanitize_user_doc(mongo_user)
        creds_dict = {
            'access_token': creds.token,
            'refresh_token': getattr(creds, 'refresh_token', None),
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes,
            'email': user_info['email'],
            'name': user_info.get('name', ''),
            'given_name': user_info.get('given_name'),
            'family_name': user_info.get('family_name'),
            'picture': user_info.get('picture'),
            'google_id': user_info.get('id'),
            'provider': 'google',
            'user': sanitized_user,
        }

        target_origin = os.getenv("FRONTEND_ORIGIN") or "*"

        html_content = f"""
        <html>
          <body>
            <script>
              try {{
                window.opener.postMessage({{google_creds: {json.dumps(creds_dict)}}}, '{target_origin}');
                window.close();
              }} catch (e) {{
                window.opener.postMessage({{error: 'Google login failed', detail: e.toString()}}, '{target_origin}');
                window.close();
              }}
            </script>
            <p>Login successful. You can close this window.</p>
          </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        logging.exception("Google OAuth callback failed")
        html_content = f"""<html><body><h3>Google OAuth failed: {str(e)}</h3></body></html>"""
        return HTMLResponse(content=html_content)

async def register_user(payload: AuthRegisterRequest):
    if users_collection is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="User store not configured")

    existing = await users_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_password = hash_password(payload.password)
    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hashed_password,
        "provider": "local",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    sanitized = sanitize_user_doc(user_doc)
    access = create_access_token({"sub": sanitized.get("email"), "uid": sanitized.get("id")})
    if payload.remember_me:
        refresh = create_refresh_token({"sub": sanitized.get("email"), "uid": sanitized.get("id")})
        resp = JSONResponse({
            "access_token": access,
            "token_type": "bearer",
            "user": sanitized,
        })
        # httpOnly, Secure in prod, SameSite=Lax to support same-site frontend
        resp.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            path="/",
        )
        return resp
    return {
        "access_token": access,
        "token_type": "bearer",
        "user": sanitized,
    }


async def login_user(payload: AuthLoginRequest):
    if users_collection is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="User store not configured")

    user = await users_collection.find_one({"email": payload.email.lower()})
    # Guard long passwords to prevent bcrypt backend errors
    if isinstance(payload.password, str) and len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password")
    if not user or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    sanitized = sanitize_user_doc(user)
    access = create_access_token({"sub": sanitized.get("email"), "uid": sanitized.get("id")})
    if payload.remember_me:
        refresh = create_refresh_token({"sub": sanitized.get("email"), "uid": sanitized.get("id")})
        resp = JSONResponse({
            "access_token": access,
            "token_type": "bearer",
            "user": sanitized,
        })
        resp.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            path="/",
        )
        return resp
    return {
        "access_token": access,
        "token_type": "bearer",
        "user": sanitized,
    }


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


async def refresh_access_token(request: Request):
    cookie = request.cookies.get("refresh_token")
    if not cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _decode_token(cookie)
    if payload.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    # Optional: ensure user still exists
    if users_collection is not None:
        user = await users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        sanitized = sanitize_user_doc(user)
        new_access = create_access_token({"sub": sanitized.get("email"), "uid": sanitized.get("id")})
        return {"access_token": new_access, "token_type": "bearer", "user": sanitized}
    # Fallback without DB
    new_access = create_access_token({"sub": email})
    return {"access_token": new_access, "token_type": "bearer"}


async def logout_user() -> JSONResponse:
    resp = JSONResponse({"detail": "Logged out"})
    resp.delete_cookie("refresh_token", path="/")
    return resp


async def get_me(request: Request):
    # Prefer Authorization: Bearer for access token; fallback to refresh cookie if present
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    token = None
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1]
    elif request.cookies.get("refresh_token"):
        payload = _decode_token(request.cookies.get("refresh_token"))
        sub = payload.get("sub")
        if users_collection is not None and sub:
            user = await users_collection.find_one({"email": sub})
            return {"user": sanitize_user_doc(user)} if user else {"user": None}
        return {"user": {"email": sub}}
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _decode_token(token)
    sub = payload.get("sub")
    if users_collection is not None and sub:
        user = await users_collection.find_one({"email": sub})
        return {"user": sanitize_user_doc(user)} if user else {"user": None}
    return {"user": {"email": sub}}


async def delete_account(request: Request):
    # Authenticate via access token or refresh cookie
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    email = None
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1]
        payload = _decode_token(token)
        email = payload.get("sub")
    elif request.cookies.get("refresh_token"):
        payload = _decode_token(request.cookies.get("refresh_token"))
        email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User store not configured")
    await users_collection.delete_one({"email": email})
    resp = JSONResponse({"detail": "Account deleted"})
    resp.delete_cookie("refresh_token", path="/")
    return resp


# TODO: Add OneDrive, Box OAuth login/callback logic here
