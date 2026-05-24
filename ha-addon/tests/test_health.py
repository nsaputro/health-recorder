"""CRUD and validation tests for health endpoints (HA addon — multi-user)."""
import pytest
from .conftest import HEADERS_A, HEADERS_B


# ── Helpers ───────────────────────────────────────────────────────────────────

BODY_METRIC_PAYLOAD = {
    "measured_at": "2026-05-24T08:00:00",
    "weight_kg": 80.0,
    "height_cm": 175.0,
}

LAB_RESULT_PAYLOAD = {
    "measured_at": "2026-05-24T08:00:00",
    "test_type": "cholesterol_total",
    "value": 190.0,
    "unit": "mg/dL",
}

VITAL_SIGN_PAYLOAD = {
    "measured_at": "2026-05-24T08:00:00",
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "heart_rate": 70,
}


# ── Body Metrics ─────────────────────────────────────────────────────────────

class TestBodyMetrics:
    def test_create_and_list(self, client):
        r = client.post("health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A)
        assert r.status_code == 201
        body = r.json()
        assert body["weight_kg"] == 80.0
        assert body["height_cm"] == 175.0

        lst = client.get("health/body-metrics", headers=HEADERS_A).json()
        assert len(lst) == 1
        assert lst[0]["id"] == body["id"]

    def test_bmi_computed_on_create(self, client):
        r = client.post("health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A)
        assert r.status_code == 201
        # BMI = 80 / (1.75)^2 = 26.1
        assert r.json()["bmi"] == pytest.approx(26.1, abs=0.1)

    def test_bmi_none_without_height(self, client):
        payload = {"measured_at": "2026-05-24T08:00:00", "weight_kg": 75.0}
        r = client.post("health/body-metrics", json=payload, headers=HEADERS_A)
        assert r.status_code == 201
        assert r.json()["bmi"] is None

    def test_get_by_id(self, client):
        record_id = client.post(
            "health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        r = client.get(f"health/body-metrics/{record_id}", headers=HEADERS_A)
        assert r.status_code == 200
        assert r.json()["id"] == record_id

    def test_get_not_found(self, client):
        r = client.get("health/body-metrics/99999", headers=HEADERS_A)
        assert r.status_code == 404

    def test_update(self, client):
        record_id = client.post(
            "health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        updated = {**BODY_METRIC_PAYLOAD, "weight_kg": 78.0}
        r = client.put(f"health/body-metrics/{record_id}", json=updated, headers=HEADERS_A)
        assert r.status_code == 200
        assert r.json()["weight_kg"] == 78.0

    def test_delete(self, client):
        record_id = client.post(
            "health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        r = client.delete(f"health/body-metrics/{record_id}", headers=HEADERS_A)
        assert r.status_code == 204
        assert (
            client.get(f"health/body-metrics/{record_id}", headers=HEADERS_A).status_code == 404
        )

    def test_invalid_weight(self, client):
        payload = {**BODY_METRIC_PAYLOAD, "weight_kg": -5.0}
        r = client.post("health/body-metrics", json=payload, headers=HEADERS_A)
        assert r.status_code == 422

    def test_user_isolation(self, client):
        client.post("health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_A)
        client.post("health/body-metrics", json=BODY_METRIC_PAYLOAD, headers=HEADERS_B)

        list_a = client.get("health/body-metrics", headers=HEADERS_A).json()
        list_b = client.get("health/body-metrics", headers=HEADERS_B).json()
        # Each user sees exactly one record — their own
        assert len(list_a) == 1
        assert len(list_b) == 1
        # Records are different (different IDs from separate inserts)
        assert list_a[0]["id"] != list_b[0]["id"]


# ── Lab Results ───────────────────────────────────────────────────────────────

class TestLabResults:
    def test_create_and_list(self, client):
        r = client.post("health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A)
        assert r.status_code == 201
        body = r.json()
        assert body["test_type"] == "cholesterol_total"
        assert body["value"] == 190.0

        lst = client.get("health/lab-results", headers=HEADERS_A).json()
        assert len(lst) == 1

    def test_filter_by_test_type(self, client):
        client.post("health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A)
        glucose = {**LAB_RESULT_PAYLOAD, "test_type": "glucose_fasting", "unit": "mg/dL"}
        client.post("health/lab-results", json=glucose, headers=HEADERS_A)

        lst = client.get(
            "health/lab-results?test_type=glucose_fasting", headers=HEADERS_A
        ).json()
        assert len(lst) == 1
        assert lst[0]["test_type"] == "glucose_fasting"

    def test_get_by_id(self, client):
        record_id = client.post(
            "health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        r = client.get(f"health/lab-results/{record_id}", headers=HEADERS_A)
        assert r.status_code == 200

    def test_update(self, client):
        record_id = client.post(
            "health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        updated = {**LAB_RESULT_PAYLOAD, "value": 200.0}
        r = client.put(f"health/lab-results/{record_id}", json=updated, headers=HEADERS_A)
        assert r.status_code == 200
        assert r.json()["value"] == 200.0

    def test_delete(self, client):
        record_id = client.post(
            "health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        assert client.delete(f"health/lab-results/{record_id}", headers=HEADERS_A).status_code == 204
        assert client.get(f"health/lab-results/{record_id}", headers=HEADERS_A).status_code == 404

    def test_user_isolation(self, client):
        client.post("health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A)
        assert client.get("health/lab-results", headers=HEADERS_B).json() == []

    def test_cross_access_denied(self, client):
        record_id = client.post(
            "health/lab-results", json=LAB_RESULT_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        assert client.get(f"health/lab-results/{record_id}", headers=HEADERS_B).status_code == 404

    def test_unknown_test_type_accepted(self, client):
        """test_type is a free-form string; unknown values are stored as-is (e.g. 'other')."""
        payload = {**LAB_RESULT_PAYLOAD, "test_type": "other", "unit": "units"}
        r = client.post("health/lab-results", json=payload, headers=HEADERS_A)
        assert r.status_code == 201
        assert r.json()["test_type"] == "other"


# ── Vital Signs ───────────────────────────────────────────────────────────────

class TestVitalSigns:
    def test_create_and_list(self, client):
        r = client.post("health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A)
        assert r.status_code == 201
        body = r.json()
        assert body["systolic_bp"] == 120
        assert body["diastolic_bp"] == 80
        assert body["heart_rate"] == 70

        lst = client.get("health/vital-signs", headers=HEADERS_A).json()
        assert len(lst) == 1

    def test_partial_vital_sign(self, client):
        """Only heart_rate, no BP fields — still valid."""
        payload = {"measured_at": "2026-05-24T08:00:00", "heart_rate": 65}
        r = client.post("health/vital-signs", json=payload, headers=HEADERS_A)
        assert r.status_code == 201
        body = r.json()
        assert body["heart_rate"] == 65
        assert body["systolic_bp"] is None
        assert body["diastolic_bp"] is None

    def test_empty_vital_sign_rejected(self, client):
        """At least one measurement is required."""
        payload = {"measured_at": "2026-05-24T08:00:00"}
        r = client.post("health/vital-signs", json=payload, headers=HEADERS_A)
        assert r.status_code == 422

    def test_get_by_id(self, client):
        record_id = client.post(
            "health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        r = client.get(f"health/vital-signs/{record_id}", headers=HEADERS_A)
        assert r.status_code == 200

    def test_update(self, client):
        record_id = client.post(
            "health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        updated = {**VITAL_SIGN_PAYLOAD, "heart_rate": 75}
        r = client.put(f"health/vital-signs/{record_id}", json=updated, headers=HEADERS_A)
        assert r.status_code == 200
        assert r.json()["heart_rate"] == 75

    def test_delete(self, client):
        record_id = client.post(
            "health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        assert client.delete(f"health/vital-signs/{record_id}", headers=HEADERS_A).status_code == 204
        assert client.get(f"health/vital-signs/{record_id}", headers=HEADERS_A).status_code == 404

    def test_user_isolation(self, client):
        client.post("health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A)
        assert client.get("health/vital-signs", headers=HEADERS_B).json() == []

    def test_cross_access_denied(self, client):
        record_id = client.post(
            "health/vital-signs", json=VITAL_SIGN_PAYLOAD, headers=HEADERS_A
        ).json()["id"]
        assert client.get(f"health/vital-signs/{record_id}", headers=HEADERS_B).status_code == 404


# ── Lab Types (static reference data) ────────────────────────────────────────

class TestLabTypes:
    def test_list_lab_types(self, client):
        r = client.get("health/lab-types", headers=HEADERS_A)
        assert r.status_code == 200
        types = r.json()
        assert len(types) > 0
        keys = {t["test_type"] for t in types}
        assert "cholesterol_total" in keys
        assert "glucose_fasting" in keys
        assert "uric_acid" in keys

    def test_lab_types_have_required_fields(self, client):
        types = client.get("health/lab-types", headers=HEADERS_A).json()
        for t in types:
            assert "test_type" in t
            assert "display_name" in t
            assert "unit" in t
