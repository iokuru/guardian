def test_database_session_dependency():
    from app.models.dependencies import get_db

    generator = get_db()
    db = next(generator)

    assert db is not None

    db.close()