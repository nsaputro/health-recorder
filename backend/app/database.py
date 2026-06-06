from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables then apply forward-only migrations."""
    from .models import health  # noqa: F401 — ensures models are registered
    Base.metadata.create_all(bind=engine)
    _migrate(engine)


def _migrate(engine):
    """Apply incremental schema migrations without Alembic.

    Each statement is wrapped in try/except so the function is idempotent —
    safe to call on every startup.
    """
    from sqlalchemy import text
    migrations = [
        "CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY, gender TEXT NOT NULL DEFAULT 'unset', created_at DATETIME, updated_at DATETIME)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()
