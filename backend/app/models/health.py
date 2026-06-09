from sqlalchemy import Column, Integer, Float, String, DateTime, Text, Boolean, Enum
from sqlalchemy.sql import func
import enum
from ..database import Base


class LabTestType(str, enum.Enum):
    # Lipid panel
    CHOLESTEROL_TOTAL = "cholesterol_total"
    CHOLESTEROL_LDL = "cholesterol_ldl"
    CHOLESTEROL_HDL = "cholesterol_hdl"
    TRIGLYCERIDES = "triglycerides"
    # Blood glucose
    GLUCOSE_FASTING = "glucose_fasting"
    GLUCOSE_RANDOM = "glucose_random"
    GLUCOSE_HBA1C = "glucose_hba1c"
    # Uric acid
    URIC_ACID = "uric_acid"
    # Liver function
    ALT = "alt"
    ALP = "alp"
    # Kidney (extended)
    CREATININE = "creatinine"
    EGFR = "egfr"
    ALBUMIN = "albumin"
    URINE_CREATININE = "urine_creatinine"
    PHOSPHATE = "phosphate"
    # Other
    HEMOGLOBIN = "hemoglobin"
    # Vitamins
    VITAMIN_D = "vitamin_d"
    OTHER = "other"


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id = Column(Integer, primary_key=True, index=True)
    measured_at = Column(DateTime(timezone=True), nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=True)  # optional, used to compute BMI
    bmi = Column(Float, nullable=True)  # computed on insert
    notes = Column(Text, nullable=True)
    synced_to_google = Column(Boolean, default=False)
    synced_to_sheets = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    measured_at = Column(DateTime(timezone=True), nullable=False)
    test_type = Column(String(64), nullable=False)  # LabTestType enum value
    value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False)  # e.g. mg/dL, mmol/L, %
    lab_name = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    synced_to_google = Column(Boolean, default=False)
    synced_to_sheets = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class VitalSign(Base):
    __tablename__ = "vital_signs"

    id = Column(Integer, primary_key=True, index=True)
    measured_at = Column(DateTime(timezone=True), nullable=False)
    systolic_bp = Column(Integer, nullable=True)   # mmHg
    diastolic_bp = Column(Integer, nullable=True)  # mmHg
    heart_rate = Column(Integer, nullable=True)    # bpm
    notes = Column(Text, nullable=True)
    synced_to_google = Column(Boolean, default=False)
    synced_to_sheets = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class GoogleCredential(Base):
    """Stores OAuth2 tokens for the single user (personal app)."""
    __tablename__ = "google_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(256), unique=True, nullable=False)
    user_name = Column(String(256), nullable=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    sheets_spreadsheet_id = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    sync_type = Column(String(32), nullable=False)   # "google_health" | "google_sheets"
    record_type = Column(String(32), nullable=False) # "body_metric" | "lab_result" | "vital_sign"
    record_id = Column(Integer, nullable=False)
    status = Column(String(16), nullable=False)      # "success" | "error"
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True)
    gender = Column(String(16), nullable=False, server_default="unset")  # "male"|"female"|"unset"
    lab_unit = Column(String(16), nullable=False, server_default="mg_dl")  # "mg_dl"|"mmol"
    weight_unit = Column(String(8), nullable=False, server_default="kg")   # "kg"|"lb"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
