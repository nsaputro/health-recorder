"""
Pytest configuration for backend tests.

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


@pytest.fixture()
def client():
    """
    Provide a TestClient backed by a fresh in-memory SQLite database.

    StaticPool ensures all SQLAlchemy connections share the same underlying
    in-memory DB so data created in one connection is visible in another.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    db_module.engine = engine
    db_module.SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine
    )
    Base.metadata.create_all(engine)

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(engine)
