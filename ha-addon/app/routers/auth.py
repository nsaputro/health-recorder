"""Google OAuth2 endpoints — HA addon variant.
After a successful callback the user is redirected back to '/' (the addon UI root)
rather than a configurable FRONTEND_URL.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.health import GoogleCredentialRead
from ..services.google_auth import (
    exchange_code,
    get_authorization_url,
    get_stored_credential,
    revoke_credentials,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login():
    """Redirect the browser to Google's OAuth2 consent screen."""
    url, _state = get_authorization_url()
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    """Google redirects here after the user grants permission."""
    try:
        exchange_code(code, db)
        # Back to the addon UI root with a success flag
        return RedirectResponse("/?google_connected=1")
    except Exception as exc:
        error_msg = str(exc)[:200]
        return RedirectResponse(f"/?google_error={error_msg}")


@router.get("/google/status", response_model=GoogleCredentialRead)
def google_status(db: Session = Depends(get_db)):
    cred = get_stored_credential(db)
    if not cred:
        raise HTTPException(status_code=404, detail="Not connected to Google")
    return cred


@router.delete("/google/disconnect")
def google_disconnect(db: Session = Depends(get_db)):
    revoke_credentials(db)
    return {"message": "Google account disconnected"}
