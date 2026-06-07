from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_SECRET_KEY: str = "dev-secret-key-change-in-production"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    DATABASE_URL: str = "sqlite:///./health_recorder.db"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    GOOGLE_SHEETS_SPREADSHEET_ID: Optional[str] = None

    # Google OAuth scopes
    GOOGLE_SCOPES: list[str] = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        # Google Health API v4 — weight, heart rate, blood glucose
        "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements",
        # Google Sheets — all metrics
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
