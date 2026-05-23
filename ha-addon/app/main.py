"""HA addon entry point — FastAPI app that also serves the vanilla-JS UI."""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Prevent the browser from caching index.html so a new addon version is
# always picked up immediately after an update.
_NO_CACHE = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}

from .config import settings
from .database import init_db
from .routers import auth, health, sync

STATIC_DIR = Path(__file__).parent.parent / "static"

app = FastAPI(
    title="Health Recorder",
    description="Personal health data recorder with Google Fit & Sheets sync",
    version="1.0.0",
    # Put Swagger docs under /docs so the catch-all doesn't swallow them
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Permissive CORS — necessary when HA ingress rewrites the origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers (registered BEFORE the static catch-all) ─────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(sync.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/healthz", tags=["meta"], include_in_schema=False)
def healthcheck():
    return {"status": "ok"}


# ── Static file serving ───────────────────────────────────────────────────────
# Mount /static/ for any assets (favicon, etc.)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static_assets")


@app.get("/", include_in_schema=False)
async def serve_root() -> FileResponse:
    """Serve the single-page app."""
    index = STATIC_DIR / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="UI not found")
    return FileResponse(str(index), headers=_NO_CACHE)


# Catch-all — serve index.html for any unmatched path so bookmarks work.
# FastAPI matches this last because it's defined after all other routes.
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str) -> FileResponse:
    index = STATIC_DIR / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="UI not found")
    return FileResponse(str(index), headers=_NO_CACHE)
