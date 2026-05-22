"""Sync endpoints — trigger Google Fit and Google Sheets pushes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.health import BodyMetric, LabResult, VitalSign
from ..services import google_fit, google_sheets
from ..services.google_auth import get_stored_credential

router = APIRouter(prefix="/sync", tags=["sync"])


def _require_google(db: Session):
    cred = get_stored_credential(db)
    if not cred:
        raise HTTPException(
            status_code=400,
            detail="Google account not connected. Visit /auth/google/login first.",
        )
    return cred


# ── Sync single record ────────────────────────────────────────────────────────

@router.post("/body-metrics/{record_id}")
def sync_body_metric(record_id: int, db: Session = Depends(get_db)):
    _require_google(db)
    record = db.query(BodyMetric).get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_body_metric(record, db)
    sheets_ok = google_sheets.sync_body_metric(record, db)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


@router.post("/lab-results/{record_id}")
def sync_lab_result(record_id: int, db: Session = Depends(get_db)):
    _require_google(db)
    record = db.query(LabResult).get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_lab_result(record, db)
    sheets_ok = google_sheets.sync_lab_result(record, db)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


@router.post("/vital-signs/{record_id}")
def sync_vital_sign(record_id: int, db: Session = Depends(get_db)):
    _require_google(db)
    record = db.query(VitalSign).get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    fit_ok = google_fit.sync_vital_sign(record, db)
    sheets_ok = google_sheets.sync_vital_sign(record, db)
    return {"google_fit": fit_ok, "google_sheets": sheets_ok}


# ── Batch sync all unsynced records ──────────────────────────────────────────

@router.post("/all")
def sync_all(db: Session = Depends(get_db)):
    """Push all unsynced records to both Google Fit and Google Sheets."""
    _require_google(db)
    fit_results = google_fit.sync_all_unsynced(db)
    sheets_results = google_sheets.sync_all_unsynced(db)
    return {
        "google_fit": fit_results,
        "google_sheets": sheets_results,
    }
