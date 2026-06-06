"""Google OAuth2 authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.health import UserPreferences
from ..schemas.health import GoogleCredentialRead, UserPreferenceRead, UserPreferenceUpdate
from ..services.google_auth import (
    get_authorization_url,
    exchange_code,
    get_stored_credential,
    revoke_credentials,
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/login")
def google_login():
    """Redirect the browser to Google's OAuth2 consent screen."""
    url, state = get_authorization_url()
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    """Google redirects here after the user grants permission."""
    try:
        cred = exchange_code(code, db)
        # Redirect to frontend settings page with success flag
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?google_connected=1")
    except Exception as e:
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?google_error={str(e)[:200]}")


@router.get("/google/status", response_model=GoogleCredentialRead)
def google_status(db: Session = Depends(get_db)):
    """Return the stored Google credential (without tokens)."""
    cred = get_stored_credential(db)
    if not cred:
        raise HTTPException(status_code=404, detail="Not connected to Google")
    return cred


@router.delete("/google/disconnect")
def google_disconnect(db: Session = Depends(get_db)):
    """Remove stored Google credentials."""
    revoke_credentials(db)
    return {"message": "Google account disconnected"}


@router.get("/preferences", response_model=UserPreferenceRead)
def get_preferences(db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter_by(id=1).first()
    return UserPreferenceRead(gender=prefs.gender if prefs else "unset")


@router.put("/preferences", response_model=UserPreferenceRead)
def update_preferences(data: UserPreferenceUpdate, db: Session = Depends(get_db)):
    if data.gender not in ("male", "female", "unset"):
        raise HTTPException(status_code=422, detail="gender must be male, female, or unset")
    prefs = db.query(UserPreferences).filter_by(id=1).first()
    if prefs:
        prefs.gender = data.gender
    else:
        db.add(UserPreferences(id=1, gender=data.gender))
    db.commit()
    return UserPreferenceRead(gender=data.gender)
