"""Tests for /auth/me and HA ingress header handling."""
import pytest
from .conftest import HEADERS_A, HEADERS_B, HEADERS_DIRECT


# ── /auth/me ─────────────────────────────────────────────────────────────────

def test_auth_me_via_ingress(client):
    """Ingress headers are reflected back in /auth/me."""
    resp = client.get("auth/me", headers=HEADERS_A)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "user-a-uuid"
    assert data["name"] == "usera"
    assert data["display_name"] == "Alice"


def test_auth_me_different_users(client):
    """Different ingress users get different identities."""
    resp_a = client.get("auth/me", headers=HEADERS_A)
    resp_b = client.get("auth/me", headers=HEADERS_B)
    assert resp_a.json()["id"] != resp_b.json()["id"]
    assert resp_a.json()["display_name"] == "Alice"
    assert resp_b.json()["display_name"] == "Bob"


def test_auth_me_direct_access(client):
    """Direct port access (no HA headers) returns empty identity."""
    resp = client.get("auth/me", headers=HEADERS_DIRECT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ""
    assert data["name"] == ""
    assert data["display_name"] == ""


def test_auth_me_impersonation_blocked(client):
    """Fake X-Remote-User-Id without X-Ingress-Path is ignored."""
    spoofed_headers = {
        "X-Remote-User-Id": "evil-user-uuid",
        "X-Remote-User-Name": "evil",
        "X-Remote-User-Display-Name": "Evil",
        # X-Ingress-Path intentionally absent
    }
    resp = client.get("auth/me", headers=spoofed_headers)
    assert resp.status_code == 200
    data = resp.json()
    # Without X-Ingress-Path the user identity headers must be ignored
    assert data["id"] == ""
    assert data["display_name"] == ""


def test_auth_me_partial_headers(client):
    """Only X-Ingress-Path present, no user headers → empty strings."""
    resp = client.get("auth/me", headers={"X-Ingress-Path": "/api/hassio_ingress/abc"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == ""
    assert data["name"] == ""
    assert data["display_name"] == ""


# ── User isolation sanity check ───────────────────────────────────────────────

def test_user_isolation_body_metrics(client):
    """Records created by user A are invisible to user B."""
    payload = {"measured_at": "2026-05-24T08:00:00", "weight_kg": 70.0}

    # User A creates a record
    r = client.post("health/body-metrics", json=payload, headers=HEADERS_A)
    assert r.status_code == 201

    # User A can see their record
    list_a = client.get("health/body-metrics", headers=HEADERS_A).json()
    assert len(list_a) == 1

    # User B sees nothing
    list_b = client.get("health/body-metrics", headers=HEADERS_B).json()
    assert list_b == []

    # Direct access (ha_user_id="") also sees nothing
    list_direct = client.get("health/body-metrics", headers=HEADERS_DIRECT).json()
    assert list_direct == []


def test_user_isolation_cross_access_denied(client):
    """User B cannot read, update, or delete a record that belongs to user A."""
    payload = {"measured_at": "2026-05-24T09:00:00", "weight_kg": 72.0}
    record_id = client.post(
        "health/body-metrics", json=payload, headers=HEADERS_A
    ).json()["id"]

    # GET by user B → 404
    assert client.get(f"health/body-metrics/{record_id}", headers=HEADERS_B).status_code == 404

    # PUT by user B → 404
    assert (
        client.put(
            f"health/body-metrics/{record_id}",
            json=payload,
            headers=HEADERS_B,
        ).status_code
        == 404
    )

    # DELETE by user B → 404
    assert (
        client.delete(f"health/body-metrics/{record_id}", headers=HEADERS_B).status_code == 404
    )
