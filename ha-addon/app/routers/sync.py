"""Sync endpoints — trigger Google Fit and Google Sheets pushes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import HAUser, get_ha_user
from ..models.health import BodyMetric, LabResult, VitalSign
from ..services import google_fit, google_sheets
from ..services.google_auth import get_stored_credential

router = APIRouter(prefix="/sync", tags=["sync"])


def _require_google(db: Session, ha_user_id: str):
    cred = get_stored_credential(db, ha_user_id=ha_user_id)
    if not cred:
        raise HTTPException(
            status_code=400,
            detail="Google account not connected. Visit /auth/google/login first.",
        )
    return cred


# ── Sync single record ────────────────────────────────────────────────────────

@router.post("/body-metrics/{record_id}")
def sync_body_metric(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    _require_google(db, user.id)
    record = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == record_id, BodyMetric.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_body_metric(record, db, ha_user_id=user.id)
    sheets_ok = google_sheets.sync_body_metric(record, db, ha_user_id=user.id)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


@router.post("/lab-results/{record_id}")
def sync_lab_result(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    _require_google(db, user.id)
    record = (
        db.query(LabResult)
        .filter(LabResult.id == record_id, LabResult.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_lab_result(record, db, ha_user_id=user.id)
    sheets_ok = google_sheets.sync_lab_result(record, db, ha_user_id=user.id)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


@router.post("/vital-signs/{record_id}")
def sync_vital_sign(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    _require_google(db, user.id)
    record = (
        db.query(VitalSign)
        .filter(VitalSign.id == record_id, VitalSign.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_vital_sign(record, db, ha_user_id=user.id)
    sheets_ok = google_sheets.sync_vital_sign(record, db, ha_user_id=user.id)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


# ── Batch sync all unsynced records ──────────────────────────────────────────

@router.post("/all")
def sync_all(user: HAUser = Depends(get_ha_user), db: Session = Depends(get_db)):
    """Push all unsynced records for the current user to Google Fit and Sheets."""
    _require_google(db, user.id)
    fit_results = google_fit.sync_all_unsynced(db, ha_user_id=user.id)
    sheets_results = google_sheets.sync_all_unsynced(db, ha_user_id=user.id)
    return {
        "google_fit": fit_results,
        "google_sheets": sheets_results,
    }
