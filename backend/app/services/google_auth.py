"""Google OAuth2 helper — builds the authorization URL and exchanges codes."""
import json
from datetime import datetime, timezone
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from ..config import settings
from ..models.health import GoogleCredential


def _client_config() -> dict:
    return {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def get_authorization_url() -> tuple[str, str]:
    """Return (authorization_url, state) for the OAuth2 redirect."""
    flow = Flow.from_client_config(
        _client_config(),
        scopes=settings.GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return url, state


def exchange_code(code: str, db: Session) -> GoogleCredential:
    """Exchange an authorization code for tokens; persist to DB."""
    flow = Flow.from_client_config(
        _client_config(),
        scopes=settings.GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Fetch user profile
    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()

    expiry = creds.expiry
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    existing = db.query(GoogleCredential).filter_by(user_email=user_info["email"]).first()
    if existing:
        existing.access_token = creds.token
        existing.refresh_token = creds.refresh_token or existing.refresh_token
        existing.token_expiry = expiry
        existing.user_name = user_info.get("name")
        db.commit()
        db.refresh(existing)
        return existing

    credential = GoogleCredential(
        user_email=user_info["email"],
        user_name=user_info.get("name"),
        access_token=creds.token,
        refresh_token=creds.refresh_token,
        token_expiry=expiry,
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


def get_credentials(db: Session) -> Optional[Credentials]:
    """Load the stored credential and return a refreshable Credentials object."""
    row = db.query(GoogleCredential).first()
    if not row:
        return None

    expiry = row.token_expiry
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    creds = Credentials(
        token=row.access_token,
        refresh_token=row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=settings.GOOGLE_SCOPES,
        expiry=expiry,
    )

    # Refresh proactively and persist the new token, so the stored credential
    # doesn't go stale (the API client refreshes in memory only).
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            row.access_token = creds.token
            new_expiry = creds.expiry
            if new_expiry and new_expiry.tzinfo is None:
                new_expiry = new_expiry.replace(tzinfo=timezone.utc)
            row.token_expiry = new_expiry
            db.commit()
        except Exception:
            # Refresh failure (revoked/offline) is reported by the API call
            # downstream, where it is logged per record.
            pass

    return creds


def get_stored_credential(db: Session) -> Optional[GoogleCredential]:
    return db.query(GoogleCredential).first()


def revoke_credentials(db: Session) -> None:
    db.query(GoogleCredential).delete()
    db.commit()
