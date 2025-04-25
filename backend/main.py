import os
from fastapi import FastAPI
from starlette.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import routers
from routes.file_routes import router as file_router
from routes.data_routes import router as data_router
from routes.auth_routes import router as auth_router

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
app.include_router(data_router)
app.include_router(auth_router)
