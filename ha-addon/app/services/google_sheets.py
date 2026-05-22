"""Google Sheets sync service.

All health metrics are written to a Google Spreadsheet, one sheet per type:
  - Body Metrics
  - Lab Results
  - Vital Signs
"""
from datetime import datetime, timezone
from typing import Optional

from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from ..models.health import BodyMetric, LabResult, VitalSign, GoogleCredential, SyncLog
from .google_auth import get_credentials, get_stored_credential

SPREADSHEET_TITLE = "Health Recorder Data"

SHEET_HEADERS = {
    "Body Metrics": [
        "ID", "Measured At", "Weight (kg)", "Height (cm)", "BMI", "Notes", "Created At"
    ],
    "Lab Results": [
        "ID", "Measured At", "Test Type", "Value", "Unit", "Lab Name", "Notes", "Created At"
    ],
    "Vital Signs": [
        "ID", "Measured At", "Systolic BP (mmHg)", "Diastolic BP (mmHg)",
        "Heart Rate (bpm)", "Notes", "Created At"
    ],
}


def _fmt(v) -> str:
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M")
    return str(v)


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


def _get_or_create_spreadsheet(service, cred_row: GoogleCredential, db: Session) -> str:
    """Return the spreadsheet ID, creating one if needed."""
    if cred_row.sheets_spreadsheet_id:
        return cred_row.sheets_spreadsheet_id

    spreadsheet = service.spreadsheets().create(body={
        "properties": {"title": SPREADSHEET_TITLE},
        "sheets": [
            {"properties": {"title": name}}
            for name in SHEET_HEADERS
        ],
    }).execute()
    sheet_id = spreadsheet["spreadsheetId"]

    # Write headers for each sheet
    for sheet_name, headers in SHEET_HEADERS.items():
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"'{sheet_name}'!A1",
            valueInputOption="RAW",
            body={"values": [headers]},
        ).execute()

    # Persist the ID
    cred_row.sheets_spreadsheet_id = sheet_id
    db.commit()
    return sheet_id


def _append_row(service, spreadsheet_id: str, sheet_name: str, row: list) -> None:
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_name}'!A1",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]},
    ).execute()


def _update_row(service, spreadsheet_id: str, sheet_name: str,
                record_id: int, row: list) -> bool:
    """Find the row with matching ID in column A and overwrite it. Returns True if found."""
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=f"'{sheet_name}'!A:A",
    ).execute()
    values = result.get("values", [])
    for i, cell in enumerate(values):
        if cell and str(cell[0]) == str(record_id):
            row_number = i + 1
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"'{sheet_name}'!A{row_number}",
                valueInputOption="USER_ENTERED",
                body={"values": [row]},
            ).execute()
            return True
    return False


# ── Public sync functions ───────────────────────────────────────────────────

def sync_body_metric(record: BodyMetric, db: Session) -> bool:
    creds = get_credentials(db)
    cred_row = get_stored_credential(db)
    if not creds or not cred_row:
        return False
    try:
        service = build("sheets", "v4", credentials=creds)
        ss_id = _get_or_create_spreadsheet(service, cred_row, db)
        row = [
            record.id,
            _fmt(record.measured_at),
            record.weight_kg,
            _fmt(record.height_cm),
            _fmt(record.bmi),
            _fmt(record.notes),
            _fmt(record.created_at),
        ]
        if not _update_row(service, ss_id, "Body Metrics", record.id, row):
            _append_row(service, ss_id, "Body Metrics", row)
        record.synced_to_sheets = True
        db.commit()
        _log(db, "google_sheets", "body_metric", record.id, "success")
        return True
    except Exception as e:
        _log(db, "google_sheets", "body_metric", record.id, "error", str(e))
        return False


def sync_lab_result(record: LabResult, db: Session) -> bool:
    creds = get_credentials(db)
    cred_row = get_stored_credential(db)
    if not creds or not cred_row:
        return False
    try:
        service = build("sheets", "v4", credentials=creds)
        ss_id = _get_or_create_spreadsheet(service, cred_row, db)
        row = [
            record.id,
            _fmt(record.measured_at),
            record.test_type,
            record.value,
            record.unit,
            _fmt(record.lab_name),
            _fmt(record.notes),
            _fmt(record.created_at),
        ]
        if not _update_row(service, ss_id, "Lab Results", record.id, row):
            _append_row(service, ss_id, "Lab Results", row)
        record.synced_to_sheets = True
        db.commit()
        _log(db, "google_sheets", "lab_result", record.id, "success")
        return True
    except Exception as e:
        _log(db, "google_sheets", "lab_result", record.id, "error", str(e))
        return False


def sync_vital_sign(record: VitalSign, db: Session) -> bool:
    creds = get_credentials(db)
    cred_row = get_stored_credential(db)
    if not creds or not cred_row:
        return False
    try:
        service = build("sheets", "v4", credentials=creds)
        ss_id = _get_or_create_spreadsheet(service, cred_row, db)
        row = [
            record.id,
            _fmt(record.measured_at),
            _fmt(record.systolic_bp),
            _fmt(record.diastolic_bp),
            _fmt(record.heart_rate),
            _fmt(record.notes),
            _fmt(record.created_at),
        ]
        if not _update_row(service, ss_id, "Vital Signs", record.id, row):
            _append_row(service, ss_id, "Vital Signs", row)
        record.synced_to_sheets = True
        db.commit()
        _log(db, "google_sheets", "vital_sign", record.id, "success")
        return True
    except Exception as e:
        _log(db, "google_sheets", "vital_sign", record.id, "error", str(e))
        return False


def sync_all_unsynced(db: Session) -> dict:
    """Batch sync all records not yet pushed to Google Sheets."""
    results = {"body_metrics": 0, "vital_signs": 0, "lab_results": 0, "errors": 0}

    for record in db.query(BodyMetric).filter_by(synced_to_sheets=False).all():
        if sync_body_metric(record, db):
            results["body_metrics"] += 1
        else:
            results["errors"] += 1

    for record in db.query(LabResult).filter_by(synced_to_sheets=False).all():
        if sync_lab_result(record, db):
            results["lab_results"] += 1
        else:
            results["errors"] += 1

    for record in db.query(VitalSign).filter_by(synced_to_sheets=False).all():
        if sync_vital_sign(record, db):
            results["vital_signs"] += 1
        else:
            results["errors"] += 1

    return results
