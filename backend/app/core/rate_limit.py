from collections import defaultdict
from time import monotonic


_requests: dict[str, list[float]] = defaultdict(list)


def is_rate_limited(
    key: str,
    limit: int,
    window_seconds: int,
) -> bool:
    now = monotonic()
    window_start = now - window_seconds

    timestamps = _requests[key]

    _requests[key] = [
        timestamp
        for timestamp in timestamps
        if timestamp > window_start
    ]

    if len(_requests[key]) >= limit:
        return True

    _requests[key].append(now)

    return False


def reset_rate_limit() -> None:
    _requests.clear()