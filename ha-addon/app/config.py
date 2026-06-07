"""HA-addon config — reads /data/options.json written by the Supervisor,
with env-var fallback for local Docker testing."""
import json
import os
from pathlib import Path
from typing import Optional

_OPTIONS_FILE = Path("/data/options.json")


def _ha_option(key: str, default: str = "") -> str:
    """Read a value from the HA Supervisor options file."""
    if _OPTIONS_FILE.exists():
        try:
            opts = json.loads(_OPTIONS_FILE.read_text())
            return opts.get(key) or default
        except Exception:
            pass
    return default


class Settings:
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "ha-health-recorder-secret")
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8099

    # Database lives in /data so it persists across addon restarts
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:////data/health_recorder.db")

    # Google credentials — HA options take priority, env vars are fallback
    GOOGLE_CLIENT_ID: str = (
        _ha_option("google_client_id") or os.getenv("GOOGLE_CLIENT_ID", "")
    )
    GOOGLE_CLIENT_SECRET: str = (
        _ha_option("google_client_secret") or os.getenv("GOOGLE_CLIENT_SECRET", "")
    )
    GOOGLE_REDIRECT_URI: str = (
        _ha_option("google_redirect_uri") or os.getenv("GOOGLE_REDIRECT_URI", "")
    )

    # After OAuth callback, redirect browser back to the addon UI root
    FRONTEND_URL: str = "/"

    GOOGLE_SCOPES: list = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        # Google Health API v4 — weight, heart rate, blood glucose
        "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements",
        # Google Fit — blood pressure only (no Health API v4 equivalent yet)
        "https://www.googleapis.com/auth/fitness.blood_pressure.read",
        "https://www.googleapis.com/auth/fitness.blood_pressure.write",
        # Google Sheets
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]


settings = Settings()
