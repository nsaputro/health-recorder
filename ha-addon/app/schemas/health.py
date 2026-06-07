from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime
from typing import Optional


# ── Body Metrics ────────────────────────────────────────────────────────────

class BodyMetricCreate(BaseModel):
    measured_at: datetime
    weight_kg: float
    height_cm: Optional[float] = None
    notes: Optional[str] = None

    @field_validator("weight_kg")
    @classmethod
    def weight_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Weight must be positive")
        return round(v, 2)

    @field_validator("height_cm")
    @classmethod
    def height_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Height must be positive")
        return v


class BodyMetricRead(BaseModel):
    id: int
    measured_at: datetime
    weight_kg: float
    height_cm: Optional[float]
    bmi: Optional[float]
    notes: Optional[str]
    synced_to_google: bool
    synced_to_sheets: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Lab Results ──────────────────────────────────────────────────────────────

LAB_TEST_UNITS: dict[str, str] = {
    "cholesterol_total": "mg/dL",
    "cholesterol_ldl":   "mg/dL",
    "cholesterol_hdl":   "mg/dL",
    "triglycerides":     "mg/dL",
    "glucose_fasting":   "mg/dL",
    "glucose_random":    "mg/dL",
    "glucose_hba1c":     "%",
    "uric_acid":         "mg/dL",
    "creatinine":        "mg/dL",
    "hemoglobin":        "g/dL",
    "alt":               "U/L",
    "alp":               "U/L",
    "egfr":             "mL/min/1.73m²",
    "albumin":          "g/dL",
    "urine_creatinine": "mg/dL",
    "vitamin_d":        "ng/mL",
    "other":             "units",
}

LAB_TEST_DISPLAY: dict[str, str] = {
    "cholesterol_total": "Total Cholesterol",
    "cholesterol_ldl":   "LDL Cholesterol",
    "cholesterol_hdl":   "HDL Cholesterol",
    "triglycerides":     "Triglycerides",
    "glucose_fasting":   "Fasting Glucose",
    "glucose_random":    "Random Glucose",
    "glucose_hba1c":     "HbA1c",
    "uric_acid":         "Uric Acid",
    "creatinine":        "Creatinine",
    "hemoglobin":        "Hemoglobin",
    "alt":               "ALT",
    "alp":               "ALP",
    "egfr":             "eGFR",
    "albumin":          "Albumin",
    "urine_creatinine": "Urine Creatinine",
    "vitamin_d":        "Vitamin D",
    "other":             "Other",
}

# Reference ranges (normal values).  Keys "male" / "female" are gender overrides.
LAB_REFERENCE_RANGES: dict[str, dict] = {
    "cholesterol_total": {"low": 0,   "normal_max": 200,  "borderline_max": 239},
    "cholesterol_ldl":   {"low": 0,   "normal_max": 100,  "borderline_max": 129},
    "cholesterol_hdl":   {
        "low": 40, "normal_max": 999, "borderline_max": 999, "higher_better": True,
        "female": {"low": 50},
    },
    "triglycerides":     {"low": 0,   "normal_max": 150,  "borderline_max": 199},
    "glucose_fasting":   {"low": 70,  "normal_max": 99,   "borderline_max": 125},
    "glucose_random":    {"low": 70,  "normal_max": 140,  "borderline_max": 199},
    "glucose_hba1c":     {"low": 0,   "normal_max": 5.7,  "borderline_max": 6.4},
    "uric_acid":         {
        "low": 2.4, "normal_max": 7.0, "borderline_max": 8.0,
        "male":   {"low": 3.4, "normal_max": 7.0, "borderline_max": 8.0},
        "female": {"low": 2.4, "normal_max": 6.0, "borderline_max": 7.0},
    },
    "creatinine":        {
        "low": 0.6, "normal_max": 1.35, "borderline_max": 1.5,
        "male":   {"low": 0.74, "normal_max": 1.35, "borderline_max": 1.5},
        "female": {"low": 0.59, "normal_max": 1.04, "borderline_max": 1.3},
    },
    "hemoglobin":        {
        "low": 12,  "normal_max": 17.5, "borderline_max": 999,
        "male":   {"low": 13.5, "normal_max": 17.5},
        "female": {"low": 12.0, "normal_max": 15.5},
    },
    "alt":               {
        "low": 7,  "normal_max": 56,  "borderline_max": 112,
        "female": {"normal_max": 45, "borderline_max": 90},
    },
    "alp":               {"low": 44, "normal_max": 147, "borderline_max": 200},
    "egfr":             {"low": 60, "normal_max": 999, "borderline_max": 999, "higher_better": True},
    "albumin":          {"low": 3.5, "normal_max": 5.0, "borderline_max": 5.5},
    "urine_creatinine": {"low": 20, "normal_max": 300,  "borderline_max": 370},
    "vitamin_d":        {"low": 30, "normal_max": 100,  "borderline_max": 100},
}


def _resolve_range(base: dict, gender: Optional[str]) -> dict:
    """Merge gender-specific overrides into the base range dict."""
    if gender in ("male", "female") and gender in base:
        return {**base, **base[gender]}
    return base


class LabResultCreate(BaseModel):
    measured_at: datetime
    test_type: str
    value: float
    unit: Optional[str] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def set_default_unit(self) -> "LabResultCreate":
        if not self.unit:
            self.unit = LAB_TEST_UNITS.get(self.test_type, "units")
        return self


class LabResultRead(BaseModel):
    id: int
    measured_at: datetime
    test_type: str
    value: float
    unit: str
    lab_name: Optional[str]
    notes: Optional[str]
    synced_to_google: bool
    synced_to_sheets: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Vital Signs ──────────────────────────────────────────────────────────────

class VitalSignCreate(BaseModel):
    measured_at: datetime
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one_value(self) -> "VitalSignCreate":
        if self.systolic_bp is None and self.diastolic_bp is None and self.heart_rate is None:
            raise ValueError("At least one of systolic_bp, diastolic_bp, or heart_rate is required")
        return self


class VitalSignRead(BaseModel):
    id: int
    measured_at: datetime
    systolic_bp: Optional[int]
    diastolic_bp: Optional[int]
    heart_rate: Optional[int]
    notes: Optional[str]
    synced_to_google: bool
    synced_to_sheets: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Google Auth ──────────────────────────────────────────────────────────────

class GoogleCredentialRead(BaseModel):
    user_email: str
    user_name: Optional[str]
    sheets_spreadsheet_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sync Log ─────────────────────────────────────────────────────────────────

class SyncLogRead(BaseModel):
    id: int
    sync_type: str
    record_type: str
    record_id: int
    status: str
    message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reference Ranges (for frontend) ─────────────────────────────────────────

class LabReferenceRange(BaseModel):
    test_type: str
    display_name: str
    unit: str
    low: Optional[float] = None
    normal_max: Optional[float] = None
    borderline_max: Optional[float] = None
    higher_better: bool = False


# ── User Preferences ─────────────────────────────────────────────────────────

class UserPreferenceRead(BaseModel):
    gender:      str = "unset"   # "male"|"female"|"unset"
    lab_unit:    str = "mg_dl"   # "mg_dl"|"mmol"
    weight_unit: str = "kg"      # "kg"|"lb"


class UserPreferenceUpdate(BaseModel):
    gender:      Optional[str] = None
    lab_unit:    Optional[str] = None
    weight_unit: Optional[str] = None
