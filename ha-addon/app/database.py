from sqlalchemy import create_engine, text
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

    SQLite supports ALTER TABLE … ADD COLUMN but raises OperationalError if
    the column already exists. We wrap each statement in try/except so the
    function is fully idempotent — safe to call on every startup.
    """
    migrations = [
        "ALTER TABLE body_metrics       ADD COLUMN ha_user_id TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE lab_results        ADD COLUMN ha_user_id TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE vital_signs        ADD COLUMN ha_user_id TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE google_credentials ADD COLUMN ha_user_id TEXT NOT NULL DEFAULT ''",
        "CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY, ha_user_id TEXT NOT NULL DEFAULT '', gender TEXT NOT NULL DEFAULT 'unset', created_at DATETIME, updated_at DATETIME)",
        "ALTER TABLE user_preferences ADD COLUMN lab_unit TEXT NOT NULL DEFAULT 'mg_dl'",
        "ALTER TABLE user_preferences ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg'",
        "ALTER TABLE sync_logs ADD COLUMN ha_user_id TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE body_metrics RENAME COLUMN synced_to_fit TO synced_to_google",
        "ALTER TABLE lab_results RENAME COLUMN synced_to_fit TO synced_to_google",
        "ALTER TABLE vital_signs RENAME COLUMN synced_to_fit TO synced_to_google",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()  # column already exists — safe to skip
