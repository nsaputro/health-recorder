"""Google Health API v4 sync service.

Supported data types:
  - Body weight   → users/me/dataTypes/weight       (weightGrams)
  - Heart rate    → users/me/dataTypes/heart-rate   (beatsPerMinute)
  - Blood glucose → users/me/dataTypes/blood-glucose (bloodGlucoseMilligramsPerDeciliter)

Blood pressure is NOT supported by the Google Health API v4 and is
therefore not synced to any Google service. It remains in Google Sheets.

API reference: https://developers.google.com/health
"""
from datetime import datetime, timezone
from typing import Optional

from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from ..models.health import BodyMetric, LabResult, VitalSign, SyncLog
from .google_auth import get_credentials


def _iso(dt: datetime) -> str:
    """Return an RFC-3339 UTC timestamp string as required by the Health API."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(db: Session, record_type: str, record_id: int,
         status: str, message: Optional[str] = None,
         ha_user_id: str = "") -> None:
    db.add(SyncLog(
        sync_type="google_health",
        record_type=record_type,
        record_id=record_id,
        status=status,
        message=message,
        ha_user_id=ha_user_id,
    ))
    db.commit()


def _create_point(service, data_type: str, body: dict) -> None:
    """POST a single DataPoint to the Health API."""
    service.users().dataTypes().dataPoints().create(
        parent=f"users/me/dataTypes/{data_type}",
        body=body,
    ).execute()


# ── Public sync functions ───────────────────────────────────────────────────

def sync_body_metric(record: BodyMetric, db: Session, ha_user_id: str = "") -> bool:
    creds = get_credentials(db, ha_user_id=ha_user_id)
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
        record.synced_to_google = True
        db.commit()
        _log(db, "body_metric", record.id, "success", ha_user_id=ha_user_id)
        return True
    except Exception as e:
        _log(db, "body_metric", record.id, "error", str(e), ha_user_id=ha_user_id)
        return False


def sync_vital_sign(record: VitalSign, db: Session, ha_user_id: str = "") -> bool:
    """Sync heart rate only; blood pressure is not supported by Health API v4."""
    if record.heart_rate is None:
        return False
    creds = get_credentials(db, ha_user_id=ha_user_id)
    if not creds:
        return False
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
        record.synced_to_google = True
        db.commit()
        _log(db, "vital_sign", record.id, "success", ha_user_id=ha_user_id)
        return True
    except Exception as e:
        _log(db, "vital_sign", record.id, "error", str(e), ha_user_id=ha_user_id)
        return False


def sync_lab_result(record: LabResult, db: Session, ha_user_id: str = "") -> bool:
    """Only glucose maps to a Google Health data type; others are Sheets-only."""
    glucose_types = {"glucose_fasting", "glucose_random"}
    if record.test_type not in glucose_types:
        return False
    creds = get_credentials(db, ha_user_id=ha_user_id)
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
        record.synced_to_google = True
        db.commit()
        _log(db, "lab_result", record.id, "success", ha_user_id=ha_user_id)
        return True
    except Exception as e:
        _log(db, "lab_result", record.id, "error", str(e), ha_user_id=ha_user_id)
        return False


def sync_all_unsynced(db: Session, ha_user_id: str = "") -> dict:
    """Batch sync all records not yet pushed to Google Health for the given user."""
    results = {"body_metrics": 0, "vital_signs": 0, "lab_results": 0, "errors": 0}

    for record in db.query(BodyMetric).filter_by(synced_to_google=False, ha_user_id=ha_user_id).all():
        if sync_body_metric(record, db, ha_user_id=ha_user_id):
            results["body_metrics"] += 1
        else:
            results["errors"] += 1

    for record in db.query(VitalSign).filter_by(synced_to_google=False, ha_user_id=ha_user_id).all():
        if sync_vital_sign(record, db, ha_user_id=ha_user_id):
            results["vital_signs"] += 1
        else:
            results["errors"] += 1

    for record in db.query(LabResult).filter_by(synced_to_google=False, ha_user_id=ha_user_id).all():
        ok = sync_lab_result(record, db, ha_user_id=ha_user_id)
        if ok:
            results["lab_results"] += 1
        # Non-syncable types (blood pressure, cholesterol, etc.) don't count as errors

    return results
