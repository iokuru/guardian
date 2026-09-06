from app.services.normalization import normalize_text


def test_normalize_text_lowercases():
    assert normalize_text("DELETE DATA") == "delete data"


def test_normalize_text_strips_whitespace():
    assert normalize_text("  delete data  ") == "delete data"


def test_normalize_text_collapses_whitespace():
    assert normalize_text("delete    all   data") == "delete all data"


def test_normalize_text_combines_normalization():
    assert normalize_text("  DELETE   ALL   DATA  ") == "delete all data"


def test_normalize_text_handles_whitespace_only():
    assert normalize_text("   ") == ""