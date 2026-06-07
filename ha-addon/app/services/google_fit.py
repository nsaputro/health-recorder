"""Google Fit REST API sync service.

As of 2026, new sync for weight/heart-rate/glucose uses the Google Health API
(google_health.py). This module now handles blood pressure only, since the
Google Health API v4 has no blood_pressure data type.

Google Fit REST API is supported until end of 2026.
"""
import time
from datetime import datetime, timezone
from typing import Optional

from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from ..models.health import BodyMetric, LabResult, VitalSign, SyncLog
from .google_auth import get_credentials

# Data-source app name (appears in Google Fit UI)
DATA_SOURCE_APP_PACKAGE = "com.healthrecorder.app"

# Google Fit data-type → field names
FIT_TYPES = {
    "weight": {
        "dataTypeName": "com.google.weight",
        "fields": [{"name": "weight", "format": "floatPoint"}],
    },
    "blood_pressure": {
        "dataTypeName": "com.google.blood_pressure",
        "fields": [
            {"name": "blood_pressure_systolic",  "format": "floatPoint"},
            {"name": "blood_pressure_diastolic", "format": "floatPoint"},
        ],
    },
    "blood_glucose": {
        "dataTypeName": "com.google.blood_glucose",
        "fields": [{"name": "blood_glucose_level", "format": "floatPoint"}],
    },
    "heart_rate": {
        "dataTypeName": "com.google.heart_rate.bpm",
        "fields": [{"name": "bpm", "format": "floatPoint"}],
    },
}


def _ns(dt: datetime) -> int:
    """Convert datetime to nanoseconds since Unix epoch (required by Fit API)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1_000_000_000)


def _get_or_create_datasource(service, data_type_key: str) -> str:
    """Return a dataSourceId, creating the data source if it doesn't exist."""
    type_info = FIT_TYPES[data_type_key]
    data_type_name = type_info["dataTypeName"]

    # List existing data sources and look for ours
    response = service.users().dataSources().list(userId="me").execute()
    for ds in response.get("dataSource", []):
        if (
            ds.get("dataType", {}).get("name") == data_type_name
            and ds.get("application", {}).get("packageName") == DATA_SOURCE_APP_PACKAGE
        ):
            return ds["dataStreamId"]

    # Create a new data source
    body = {
        "dataStreamName": f"HealthRecorder_{data_type_key}",
        "type": "raw",
        "application": {
            "packageName": DATA_SOURCE_APP_PACKAGE,
            "name": "Health Recorder",
            "version": "1",
        },
        "dataType": {
            "name": data_type_name,
            "field": type_info["fields"],
        },
    }
    ds = service.users().dataSources().create(userId="me", body=body).execute()
    return ds["dataStreamId"]


def _log(db: Session, sync_type: str, record_type: str, record_id: int,
         status: str, message: Optional[str] = None) -> None:
    db.add(SyncLog(
        sync_type=sync_type,
        record_type=record_type,
        record_id=record_id,
        status=status,
        message=message,
    ))
    db.commit()


# ── Public sync functions ───────────────────────────────────────────────────

def sync_body_metric(record: BodyMetric, db: Session, ha_user_id: str = "") -> bool:
    creds = get_credentials(db, ha_user_id=ha_user_id)
    if not creds:
        return False
    try:
        service = build("fitness", "v1", credentials=creds)
        ds_id = _get_or_create_datasource(service, "weight")
        ns = _ns(record.measured_at)
        dataset_id = f"{ns}-{ns}"
        body = {
            "dataSourceId": ds_id,
            "maxEndTimeNs": ns,
            "minStartTimeNs": ns,
            "point": [{
                "dataTypeName": "com.google.weight",
                "startTimeNanos": str(ns),
                "endTimeNanos":   str(ns),
                "value": [{"fpVal": record.weight_kg}],
            }],
        }
        service.users().dataSets().patch(
            userId="me", dataSourceId=ds_id, datasetId=dataset_id, body=body
        ).execute()
        record.synced_to_fit = True
        db.commit()
        _log(db, "google_fit", "body_metric", record.id, "success")
        return True
    except Exception as e:
        _log(db, "google_fit", "body_metric", record.id, "error", str(e))
        return False


def sync_vital_sign(record: VitalSign, db: Session, ha_user_id: str = "") -> bool:
    creds = get_credentials(db, ha_user_id=ha_user_id)
    if not creds:
        return False
    synced_any = False
    try:
        service = build("fitness", "v1", credentials=creds)
        ns = _ns(record.measured_at)
        dataset_id = f"{ns}-{ns}"

        # Blood pressure
        if record.systolic_bp is not None and record.diastolic_bp is not None:
            ds_id = _get_or_create_datasource(service, "blood_pressure")
            body = {
                "dataSourceId": ds_id,
                "maxEndTimeNs": ns,
                "minStartTimeNs": ns,
                "point": [{
                    "dataTypeName": "com.google.blood_pressure",
                    "startTimeNanos": str(ns),
                    "endTimeNanos":   str(ns),
                    "value": [
                        {"fpVal": float(record.systolic_bp)},
                        {"fpVal": float(record.diastolic_bp)},
                    ],
                }],
            }
            service.users().dataSets().patch(
                userId="me", dataSourceId=ds_id, datasetId=dataset_id, body=body
            ).execute()
            synced_any = True

        # Heart rate
        if record.heart_rate is not None:
            ds_id = _get_or_create_datasource(service, "heart_rate")
            body = {
                "dataSourceId": ds_id,
                "maxEndTimeNs": ns,
                "minStartTimeNs": ns,
                "point": [{
                    "dataTypeName": "com.google.heart_rate.bpm",
                    "startTimeNanos": str(ns),
                    "endTimeNanos":   str(ns),
                    "value": [{"fpVal": float(record.heart_rate)}],
                }],
            }
            service.users().dataSets().patch(
                userId="me", dataSourceId=ds_id, datasetId=dataset_id, body=body
            ).execute()
            synced_any = True

        if synced_any:
            record.synced_to_fit = True
            db.commit()
            _log(db, "google_fit", "vital_sign", record.id, "success")
        return synced_any
    except Exception as e:
        _log(db, "google_fit", "vital_sign", record.id, "error", str(e))
        return False


def sync_lab_result(record: LabResult, db: Session, ha_user_id: str = "") -> bool:
    """Only glucose maps to a Google Fit data type; others are Sheets-only."""
    creds = get_credentials(db, ha_user_id=ha_user_id)
    if not creds:
        return False
    glucose_types = {"glucose_fasting", "glucose_random"}
    if record.test_type not in glucose_types:
        # Not a native Fit type — mark as not applicable (skip silently)
        return False
    try:
        service = build("fitness", "v1", credentials=creds)
        ns = _ns(record.measured_at)
        dataset_id = f"{ns}-{ns}"
        ds_id = _get_or_create_datasource(service, "blood_glucose")

        # Google Fit expects mmol/L; convert from mg/dL if needed
        value = record.value
        if record.unit == "mg/dL":
            value = value / 18.0  # mg/dL → mmol/L

        body = {
            "dataSourceId": ds_id,
            "maxEndTimeNs": ns,
            "minStartTimeNs": ns,
            "point": [{
                "dataTypeName": "com.google.blood_glucose",
                "startTimeNanos": str(ns),
                "endTimeNanos":   str(ns),
                "value": [{"fpVal": value}],
            }],
        }
        service.users().dataSets().patch(
            userId="me", dataSourceId=ds_id, datasetId=dataset_id, body=body
        ).execute()
        record.synced_to_fit = True
        db.commit()
        _log(db, "google_fit", "lab_result", record.id, "success")
        return True
    except Exception as e:
        _log(db, "google_fit", "lab_result", record.id, "error", str(e))
        return False


def sync_vital_sign_bp(record: VitalSign, db: Session, ha_user_id: str = "") -> bool:
    """Sync blood pressure only (no Health API equivalent; keeps using Fit)."""
    if record.systolic_bp is None or record.diastolic_bp is None:
        return False
    creds = get_credentials(db, ha_user_id=ha_user_id)
    if not creds:
        return False
    try:
        service = build("fitness", "v1", credentials=creds)
        ns = _ns(record.measured_at)
        ds_id = _get_or_create_datasource(service, "blood_pressure")
        body = {
            "dataSourceId": ds_id,
            "maxEndTimeNs": ns,
            "minStartTimeNs": ns,
            "point": [{
                "dataTypeName": "com.google.blood_pressure",
                "startTimeNanos": str(ns),
                "endTimeNanos":   str(ns),
                "value": [
                    {"fpVal": float(record.systolic_bp)},
                    {"fpVal": float(record.diastolic_bp)},
                ],
            }],
        }
        service.users().dataSets().patch(
            userId="me", dataSourceId=ds_id,
            datasetId=f"{ns}-{ns}", body=body,
        ).execute()
        return True
    except Exception as e:
        _log(db, "google_fit", "vital_sign", record.id, "error", str(e))
        return False


def sync_all_unsynced(db: Session, ha_user_id: str = "") -> dict:
    """Batch sync all records not yet pushed to Google Fit for the given user."""
    results = {"body_metrics": 0, "vital_signs": 0, "lab_results": 0, "errors": 0}

    for record in db.query(BodyMetric).filter_by(synced_to_fit=False, ha_user_id=ha_user_id).all():
        if sync_body_metric(record, db, ha_user_id=ha_user_id):
            results["body_metrics"] += 1
        else:
            results["errors"] += 1

    for record in db.query(VitalSign).filter_by(synced_to_fit=False, ha_user_id=ha_user_id).all():
        if sync_vital_sign(record, db, ha_user_id=ha_user_id):
            results["vital_signs"] += 1
        else:
            results["errors"] += 1

    for record in db.query(LabResult).filter_by(synced_to_fit=False, ha_user_id=ha_user_id).all():
        ok = sync_lab_result(record, db, ha_user_id=ha_user_id)
        if ok:
            results["lab_results"] += 1
        # Non-synchable types don't count as errors

    return results
