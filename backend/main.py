import os
import sys
from fastapi import FastAPI
from starlette.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure project root is on sys.path so `backend.*` imports work regardless of CWD
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import routers
from backend.routes.file_routes import router as file_router
from backend.routes.data_routes import router as data_router
from backend.routes.auth_routes import router as auth_router
from backend.routes.feature_engineering_routes import router as feature_engineering_router
from backend.routes.auto_ml_routes import router as auto_ml_router

load_dotenv()

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(file_router)
app.include_router(data_router, prefix="/api/data", tags=["Data Preprocessing"])
app.include_router(feature_engineering_router, prefix="/api/feature-engineering", tags=["Feature Engineering"])
app.include_router(auto_ml_router)
app.include_router(auth_router)
