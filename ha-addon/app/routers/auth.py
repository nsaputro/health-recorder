"""Google OAuth2 endpoints — HA addon variant (multi-user).

After a successful callback the user is redirected back to '/' (the addon UI root).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import HAUser, get_ha_user
from ..models.health import UserPreferences
from ..schemas.health import GoogleCredentialRead, UserPreferenceRead, UserPreferenceUpdate
from ..services.google_auth import (
    exchange_code,
    get_authorization_url,
    get_stored_credential,
    revoke_credentials,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def auth_me(user: HAUser = Depends(get_ha_user)):
    """Return the HA user identity extracted from ingress headers."""
    return {
        "id": user.id,
        "name": user.name,
        "display_name": user.display_name,
    }


@router.get("/google/login")
def google_login(user: HAUser = Depends(get_ha_user)):
    """Redirect the browser to Google's OAuth2 consent screen.

    The current user's HA ID is embedded in the OAuth state so it survives
    the round-trip redirect through Google back to port 8099 (where HA ingress
    headers are absent).
    """
    url, _state = get_authorization_url(ha_user_id=user.id)
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    """Google redirects here after the user grants permission.

    State format: ``<ha_user_id>|<random>`` (see google_auth.get_authorization_url).
    """
    # Recover ha_user_id from the composite state (no HA headers on port 8099)
    ha_user_id = state.split("|", 1)[0] if "|" in state else ""
    try:
        exchange_code(code, db, ha_user_id=ha_user_id)
        return RedirectResponse("/?google_connected=1")
    except Exception as exc:
        error_msg = str(exc)[:200]
        return RedirectResponse(f"/?google_error={error_msg}")


@router.get("/google/status", response_model=GoogleCredentialRead)
def google_status(user: HAUser = Depends(get_ha_user), db: Session = Depends(get_db)):
    cred = get_stored_credential(db, ha_user_id=user.id)
    if not cred:
        raise HTTPException(status_code=404, detail="Not connected to Google")
    return cred


@router.delete("/google/disconnect")
def google_disconnect(user: HAUser = Depends(get_ha_user), db: Session = Depends(get_db)):
    revoke_credentials(db, ha_user_id=user.id)
    return {"message": "Google account disconnected"}


@router.get("/preferences", response_model=UserPreferenceRead)
def get_preferences(user: HAUser = Depends(get_ha_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter_by(ha_user_id=user.id).first()
    return UserPreferenceRead(
        gender=prefs.gender if prefs else "unset",
        lab_unit=prefs.lab_unit if prefs else "mg_dl",
        weight_unit=prefs.weight_unit if prefs else "kg",
    )


_VALID_PREFS = {
    "gender":      {"male", "female", "unset"},
    "lab_unit":    {"mg_dl", "mmol"},
    "weight_unit": {"kg", "lb"},
}


@router.put("/preferences", response_model=UserPreferenceRead)
def update_preferences(
    data: UserPreferenceUpdate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    for field, allowed in _VALID_PREFS.items():
        val = getattr(data, field, None)
        if val is not None and val not in allowed:
            raise HTTPException(status_code=422, detail=f"{field} must be one of {sorted(allowed)}")
    prefs = db.query(UserPreferences).filter_by(ha_user_id=user.id).first()
    if not prefs:
        prefs = UserPreferences(ha_user_id=user.id)
        db.add(prefs)
    if data.gender is not None:
        prefs.gender = data.gender
    if data.lab_unit is not None:
        prefs.lab_unit = data.lab_unit
    if data.weight_unit is not None:
        prefs.weight_unit = data.weight_unit
    db.commit()
    return UserPreferenceRead(
        gender=prefs.gender,
        lab_unit=prefs.lab_unit,
        weight_unit=prefs.weight_unit,
    )
