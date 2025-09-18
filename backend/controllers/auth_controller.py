# Handles user upsert and OAuth logic for Google, OneDrive, Box
from fastapi import Request
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from backend.config import users_collection
import os
import json
import warnings
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from backend.models.pydantic_models import UploadFromGoogleDriveRequest

import logging
logging.basicConfig(level=logging.INFO)

def log_env_vars():
    logging.info(f"GOOGLE_OAUTH_CLIENT_ID: {os.getenv('GOOGLE_OAUTH_CLIENT_ID')}")
    logging.info(f"GOOGLE_OAUTH_CLIENT_SECRET: {os.getenv('GOOGLE_OAUTH_CLIENT_SECRET')}")
    logging.info(f"GOOGLE_OAUTH_REDIRECT_URI: {os.getenv('GOOGLE_OAUTH_REDIRECT_URI')}")
    logging.info(f"GOOGLE_OAUTH_PROJECT_ID: {os.getenv('GOOGLE_OAUTH_PROJECT_ID')}")

log_env_vars()

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
            "note": "users_collection not configured; skipped DB write"
        }
    user_doc = {
        "google_id": google_id,
        "email": email,
        "name": name,
        "picture": picture,
    }
    await users_collection.update_one(
        {"google_id": google_id},
        {"$set": user_doc},
        upsert=True
    )
    return user_doc

def google_login():
    flow = Flow.from_client_config(
        GOOGLE_OAUTH_CONFIG,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return RedirectResponse(auth_url)

async def google_callback(code: str, request: Request):
    try:
        flow = Flow.from_client_config(
            GOOGLE_OAUTH_CONFIG,
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)
        creds = flow.credentials
        oauth2_service = build('oauth2', 'v2', credentials=creds)
        user_info = oauth2_service.userinfo().get().execute()
        creds_dict = {
            'access_token': creds.token,
            'refresh_token': getattr(creds, 'refresh_token', None),
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes,
            'email': user_info['email'],
            'name': user_info.get('name', '')
        }
        referer = request.headers.get('referer')
        target_origin = 'http://localhost:5173'
        if referer:
            import re
            match = re.match(r'(https?://[^/]+)', referer)
            if match:
                target_origin = match.group(1)
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
        import traceback
        html_content = f"""<html><body><h3>Google OAuth failed: {str(e)}</h3></body></html>"""
        return HTMLResponse(content=html_content)

# TODO: Add OneDrive, Box OAuth login/callback logic here
