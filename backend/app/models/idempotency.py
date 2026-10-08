from datetime import datetime, timezone
from typing import Any, Optional

from beanie import Document, Indexed
from pydantic import Field


class IdempotencyRecord(Document):
    """Records a request + response for a client-provided idempotency key."""

    key: Indexed(str)  # type: ignore
    endpoint: Indexed(str)  # type: ignore
    response_status: int = 200
    response_body: Optional[dict[str, Any]] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "idempotency_records"
        # Compound unique index — same key + endpoint = one record
        indexes = [
            [("key", 1), ("endpoint", 1)],
        ]