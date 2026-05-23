"""Google OAuth2 helper — builds the authorization URL and exchanges codes."""
import secrets
from datetime import datetime, timezone
from typing import Optional

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


def get_authorization_url(ha_user_id: str = "") -> tuple[str, str]:
    """Return (authorization_url, state) for the OAuth2 redirect.

    The OAuth ``state`` parameter is a composite string:
    ``<ha_user_id>|<random_token>``.  The ``|`` separator is safe because HA
    user IDs are UUIDs (hex + hyphens only).  The composite state is returned
    verbatim by Google on the callback, allowing ``google_callback`` to recover
    ``ha_user_id`` even though the callback lands on port 8099 where HA ingress
    headers are not present.
    """
    flow = Flow.from_client_config(
        _client_config(),
        scopes=settings.GOOGLE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    composite_state = f"{ha_user_id}|{secrets.token_urlsafe(16)}"
    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=composite_state,
    )
    return url, composite_state


def exchange_code(code: str, db: Session, ha_user_id: str = "") -> GoogleCredential:
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

    existing = db.query(GoogleCredential).filter_by(
        ha_user_id=ha_user_id, user_email=user_info["email"]
    ).first()
    if existing:
        existing.access_token = creds.token
        existing.refresh_token = creds.refresh_token or existing.refresh_token
        existing.token_expiry = expiry
        existing.user_name = user_info.get("name")
        db.commit()
        db.refresh(existing)
        return existing

    credential = GoogleCredential(
        ha_user_id=ha_user_id,
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


def get_credentials(db: Session, ha_user_id: str = "") -> Optional[Credentials]:
    """Load the stored credential and return a refreshable Credentials object."""
    row = db.query(GoogleCredential).filter_by(ha_user_id=ha_user_id).first()
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
    return creds


def get_stored_credential(db: Session, ha_user_id: str = "") -> Optional[GoogleCredential]:
    return db.query(GoogleCredential).filter_by(ha_user_id=ha_user_id).first()


def revoke_credentials(db: Session, ha_user_id: str = "") -> None:
    db.query(GoogleCredential).filter_by(ha_user_id=ha_user_id).delete()
    db.commit()
