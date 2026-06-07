from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import health, auth, sync


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Health Recorder API",
    description="Personal health data recorder with Google Health and Google Sheets sync",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server and any configured frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(sync.router)


@app.get("/", tags=["meta"])
def root():
    return {"message": "Health Recorder API", "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health_check():
    return {"status": "ok"}
