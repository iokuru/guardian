import pytest

from app.core.rate_limit import (
    is_rate_limited,
    reset_rate_limit,
)


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    reset_rate_limit()
    yield
    reset_rate_limit()


def test_rate_limit_allows_requests():
    key = "test-client"

    for _ in range(5):
        assert is_rate_limited(key, 5, 60) is False


def test_rate_limit_blocks_excess_requests():
    key = "test-client"

    for _ in range(5):
        is_rate_limited(key, 5, 60)

    assert is_rate_limited(key, 5, 60) is True


def test_rate_limit_is_per_key():
    key_a = "client-a"
    key_b = "client-b"

    for _ in range(5):
        is_rate_limited(key_a, 5, 60)

    assert is_rate_limited(key_a, 5, 60) is True
    assert is_rate_limited(key_b, 5, 60) is False