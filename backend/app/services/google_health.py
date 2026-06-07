"""Google Health API v4 sync service.

Replaces Google Fit for all supported data types:
  - Body weight   → users/me/dataTypes/weight
  - Heart rate    → users/me/dataTypes/heart-rate
  - Blood glucose → users/me/dataTypes/blood-glucose

Blood pressure is NOT supported by the Google Health API v4 — it remains
synced via the legacy Google Fit API (google_fit.py) until a replacement
is available.

API reference: https://developers.google.com/health
"""
from datetime import datetime, timezone
from typing import Optional

from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from ..models.health import BodyMetric, LabResult, VitalSign, SyncLog
from .google_auth import get_credentials
from . import google_fit  # blood pressure still uses Fit


def _iso(dt: datetime) -> str:
    """Return an RFC-3339 UTC timestamp string as required by the Health API."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(db: Session, record_type: str, record_id: int,
         status: str, message: Optional[str] = None) -> None:
    db.add(SyncLog(
        sync_type="google_health",
        record_type=record_type,
        record_id=record_id,
        status=status,
        message=message,
    ))
    db.commit()


def _create_point(service, data_type: str, body: dict) -> None:
    """POST a single DataPoint to the Health API."""
    service.users().dataTypes().dataPoints().create(
        parent=f"users/me/dataTypes/{data_type}",
        body=body,
    ).execute()


# ── Public sync functions ───────────────────────────────────────────────────

def sync_body_metric(record: BodyMetric, db: Session) -> bool:
    creds = get_credentials(db)
    if not creds:
        return False
    try:
        service = build("health", "v4", credentials=creds)
        _create_point(service, "weight", {
            "weight": {
                "weightGrams": record.weight_kg * 1000,
                "sampleTime": {
                    "physicalTime": _iso(record.measured_at),
                    "utcOffset": "0s",
                },
            }
        })
        record.synced_to_fit = True
        db.commit()
        _log(db, "body_metric", record.id, "success")
        return True
    except Exception as e:
        _log(db, "body_metric", record.id, "error", str(e))
        return False


def sync_vital_sign(record: VitalSign, db: Session) -> bool:
    creds = get_credentials(db)
    if not creds:
        return False
    synced_any = False
    errors = []

    # Blood pressure — Health API v4 has no blood_pressure data type; use Fit
    if record.systolic_bp is not None and record.diastolic_bp is not None:
        bp_ok = google_fit.sync_vital_sign_bp(record, db)
        if bp_ok:
            synced_any = True
        else:
            errors.append("blood_pressure sync failed")

    # Heart rate — Health API v4
    if record.heart_rate is not None:
        try:
            service = build("health", "v4", credentials=creds)
            _create_point(service, "heart-rate", {
                "heartRate": {
                    "beatsPerMinute": str(record.heart_rate),
                    "sampleTime": {
                        "physicalTime": _iso(record.measured_at),
                        "utcOffset": "0s",
                    },
                }
            })
            synced_any = True
        except Exception as e:
            errors.append(f"heart_rate: {e}")

    if synced_any:
        record.synced_to_fit = True
        db.commit()
        _log(db, "vital_sign", record.id, "success",
             "; ".join(errors) if errors else None)
    elif errors:
        _log(db, "vital_sign", record.id, "error", "; ".join(errors))
    return synced_any


def sync_lab_result(record: LabResult, db: Session) -> bool:
    """Only glucose maps to a Google Health data type; others are Sheets-only."""
    glucose_types = {"glucose_fasting", "glucose_random"}
    if record.test_type not in glucose_types:
        return False
    creds = get_credentials(db)
    if not creds:
        return False
    try:
        service = build("health", "v4", credentials=creds)
        # Health API expects mg/dL; convert from mmol/L if needed
        value_mgdl = record.value
        if record.unit == "mmol/L":
            value_mgdl = record.value * 18.0
        _create_point(service, "blood-glucose", {
            "bloodGlucose": {
                "bloodGlucoseMilligramsPerDeciliter": value_mgdl,
                "measurementTiming": (
                    "FASTING" if record.test_type == "glucose_fasting" else "GENERAL"
                ),
                "sampleTime": {
                    "physicalTime": _iso(record.measured_at),
                    "utcOffset": "0s",
                },
            }
        })
        record.synced_to_fit = True
        db.commit()
        _log(db, "lab_result", record.id, "success")
        return True
    except Exception as e:
        _log(db, "lab_result", record.id, "error", str(e))
        return False


def sync_all_unsynced(db: Session) -> dict:
    """Batch sync all records not yet pushed to Google Health."""
    results = {"body_metrics": 0, "vital_signs": 0, "lab_results": 0, "errors": 0}

    for record in db.query(BodyMetric).filter_by(synced_to_fit=False).all():
        if sync_body_metric(record, db):
            results["body_metrics"] += 1
        else:
            results["errors"] += 1

    for record in db.query(VitalSign).filter_by(synced_to_fit=False).all():
        if sync_vital_sign(record, db):
            results["vital_signs"] += 1
        else:
            results["errors"] += 1

    for record in db.query(LabResult).filter_by(synced_to_fit=False).all():
        ok = sync_lab_result(record, db)
        if ok:
            results["lab_results"] += 1
        # Non-syncable types don't count as errors

    return results
