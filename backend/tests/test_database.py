from sqlalchemy import create_engine, inspect

from sqlalchemy.pool import StaticPool

from app.models.database import Base
from app.models.analysis import Analysis
from app.models.finding import Finding
from app.models.user import User


def test_database_tables_created():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)

    tables = inspector.get_table_names()

    assert "users" in tables
    assert "analyses" in tables
    assert "findings" in tables


def test_analysis_has_user_id():
    assert "user_id" in Analysis.__table__.columns


def test_finding_has_severity():
    assert "severity" in Finding.__table__.columns


def test_user_columns():
    columns = User.__table__.columns

    assert "id" in columns
    assert "username" in columns
    assert "email" in columns
    assert "hashed_password" in columns
    assert "role" in columns
    assert "created_at" in columns