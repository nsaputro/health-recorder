"""
Pytest configuration for ha-addon tests.

DATABASE_URL must be set before app modules are imported so that
the module-level Settings class picks up the in-memory SQLite URL.
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as db_module
from app.database import Base
from app.main import app

# ── HA ingress header sets ────────────────────────────────────────────────────

HEADERS_A = {
    "X-Ingress-Path": "/api/hassio_ingress/abc",
    "X-Remote-User-Id": "user-a-uuid",
    "X-Remote-User-Name": "usera",
    "X-Remote-User-Display-Name": "Alice",
}

HEADERS_B = {
    "X-Ingress-Path": "/api/hassio_ingress/abc",
    "X-Remote-User-Id": "user-b-uuid",
    "X-Remote-User-Name": "userb",
    "X-Remote-User-Display-Name": "Bob",
}

# Direct port access — no HA headers, ha_user_id falls back to ""
HEADERS_DIRECT: dict = {}


# ── Client fixture ────────────────────────────────────────────────────────────

@pytest.fixture()
def client():
    """
    Provide a TestClient backed by a fresh in-memory SQLite database.

    StaticPool ensures all SQLAlchemy connections share the same underlying
    in-memory DB so data created in one connection is visible in another,
    which matches how the app uses a connection pool in production.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Patch module-level engine and SessionLocal so both init_db() (called
    # by lifespan) and get_db() (called by every request) use this engine.
    db_module.engine = engine
    db_module.SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    Base.metadata.create_all(engine)

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(engine)
