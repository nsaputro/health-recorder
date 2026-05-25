"""CRUD endpoints for health data."""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import HAUser, get_ha_user
from ..models.health import BodyMetric, LabResult, VitalSign
from ..schemas.health import (
    BodyMetricCreate, BodyMetricRead,
    LabResultCreate, LabResultRead,
    VitalSignCreate, VitalSignRead,
    LAB_TEST_UNITS, LAB_TEST_DISPLAY, LAB_REFERENCE_RANGES,
    LabReferenceRange,
)

router = APIRouter(prefix="/health", tags=["health"])


# ── Helper ───────────────────────────────────────────────────────────────────

def _compute_bmi(weight_kg: float, height_cm: Optional[float]) -> Optional[float]:
    if height_cm and height_cm > 0:
        h_m = height_cm / 100
        return round(weight_kg / (h_m ** 2), 1)
    return None


# ── Body Metrics ─────────────────────────────────────────────────────────────

@router.get("/body-metrics", response_model=List[BodyMetricRead])
def list_body_metrics(
    since: Optional[datetime] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    q = db.query(BodyMetric).filter(BodyMetric.ha_user_id == user.id)
    if since:
        q = q.filter(BodyMetric.measured_at >= since)
    return q.order_by(BodyMetric.measured_at.desc()).offset(offset).limit(limit).all()


@router.post("/body-metrics", response_model=BodyMetricRead, status_code=201)
def create_body_metric(
    payload: BodyMetricCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    bmi = _compute_bmi(payload.weight_kg, payload.height_cm)
    record = BodyMetric(
        ha_user_id=user.id,
        measured_at=payload.measured_at,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        bmi=bmi,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/body-metrics/{record_id}", response_model=BodyMetricRead)
def get_body_metric(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == record_id, BodyMetric.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.put("/body-metrics/{record_id}", response_model=BodyMetricRead)
def update_body_metric(
    record_id: int,
    payload: BodyMetricCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == record_id, BodyMetric.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    record.measured_at = payload.measured_at
    record.weight_kg = payload.weight_kg
    record.height_cm = payload.height_cm
    record.bmi = _compute_bmi(payload.weight_kg, payload.height_cm)
    record.notes = payload.notes
    record.synced_to_fit = False
    record.synced_to_sheets = False
    db.commit()
    db.refresh(record)
    return record


@router.delete("/body-metrics/{record_id}", status_code=204)
def delete_body_metric(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == record_id, BodyMetric.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ── Lab Results ───────────────────────────────────────────────────────────────

@router.get("/lab-results", response_model=List[LabResultRead])
def list_lab_results(
    test_type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = Query(default=200, le=500),
    offset: int = 0,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    q = db.query(LabResult).filter(LabResult.ha_user_id == user.id)
    if test_type:
        q = q.filter(LabResult.test_type == test_type)
    if since:
        q = q.filter(LabResult.measured_at >= since)
    return q.order_by(LabResult.measured_at.desc()).offset(offset).limit(limit).all()


@router.post("/lab-results", response_model=LabResultRead, status_code=201)
def create_lab_result(
    payload: LabResultCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = LabResult(
        ha_user_id=user.id,
        measured_at=payload.measured_at,
        test_type=payload.test_type,
        value=payload.value,
        unit=payload.unit,
        lab_name=payload.lab_name,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/lab-results/{record_id}", response_model=LabResultRead)
def get_lab_result(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(LabResult)
        .filter(LabResult.id == record_id, LabResult.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.put("/lab-results/{record_id}", response_model=LabResultRead)
def update_lab_result(
    record_id: int,
    payload: LabResultCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(LabResult)
        .filter(LabResult.id == record_id, LabResult.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for field in ("measured_at", "test_type", "value", "unit", "lab_name", "notes"):
        setattr(record, field, getattr(payload, field))
    record.synced_to_fit = False
    record.synced_to_sheets = False
    db.commit()
    db.refresh(record)
    return record


@router.delete("/lab-results/{record_id}", status_code=204)
def delete_lab_result(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(LabResult)
        .filter(LabResult.id == record_id, LabResult.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ── Vital Signs ───────────────────────────────────────────────────────────────

@router.get("/vital-signs", response_model=List[VitalSignRead])
def list_vital_signs(
    since: Optional[datetime] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    q = db.query(VitalSign).filter(VitalSign.ha_user_id == user.id)
    if since:
        q = q.filter(VitalSign.measured_at >= since)
    return q.order_by(VitalSign.measured_at.desc()).offset(offset).limit(limit).all()


@router.post("/vital-signs", response_model=VitalSignRead, status_code=201)
def create_vital_sign(
    payload: VitalSignCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = VitalSign(
        ha_user_id=user.id,
        measured_at=payload.measured_at,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=payload.heart_rate,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/vital-signs/{record_id}", response_model=VitalSignRead)
def get_vital_sign(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VitalSign)
        .filter(VitalSign.id == record_id, VitalSign.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.put("/vital-signs/{record_id}", response_model=VitalSignRead)
def update_vital_sign(
    record_id: int,
    payload: VitalSignCreate,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VitalSign)
        .filter(VitalSign.id == record_id, VitalSign.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for field in ("measured_at", "systolic_bp", "diastolic_bp", "heart_rate", "notes"):
        setattr(record, field, getattr(payload, field))
    record.synced_to_fit = False
    record.synced_to_sheets = False
    db.commit()
    db.refresh(record)
    return record


@router.delete("/vital-signs/{record_id}", status_code=204)
def delete_vital_sign(
    record_id: int,
    user: HAUser = Depends(get_ha_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(VitalSign)
        .filter(VitalSign.id == record_id, VitalSign.ha_user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ── Reference data ────────────────────────────────────────────────────────────

@router.get("/lab-types", response_model=List[LabReferenceRange])
def list_lab_types():
    """Return all supported lab test types with display names and reference ranges."""
    result = []
    for key, display in LAB_TEST_DISPLAY.items():
        ref = LAB_REFERENCE_RANGES.get(key, {})
        result.append(LabReferenceRange(
            test_type=key,
            display_name=display,
            unit=LAB_TEST_UNITS.get(key, "units"),
            low=ref.get("low"),
            normal_max=ref.get("normal_max"),
            borderline_max=ref.get("borderline_max"),
        ))
    return result
