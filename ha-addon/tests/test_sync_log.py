"""Regression tests for sync audit logging.

SyncLog rows must record which HA user the sync belonged to — the _log
helpers in both sync services pass ha_user_id, and the model must accept it
(this used to raise TypeError because the column was missing).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.health import SyncLog
from app.services import google_health, google_sheets


def _session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def test_google_health_log_records_user():
    db = _session()
    google_health._log(db, "body_metric", 1, "success", ha_user_id="user-a-uuid")
    row = db.query(SyncLog).one()
    assert row.ha_user_id == "user-a-uuid"
    assert row.sync_type == "google_health"
    assert row.status == "success"


def test_google_sheets_log_records_user():
    db = _session()
    google_sheets._log(db, "google_sheets", "lab_result", 2, "error", "boom",
                       ha_user_id="user-b-uuid")
    row = db.query(SyncLog).one()
    assert row.ha_user_id == "user-b-uuid"
    assert row.sync_type == "google_sheets"
    assert row.message == "boom"
