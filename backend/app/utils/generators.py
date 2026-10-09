import secrets
from datetime import datetime, timezone


def generate_order_reference() -> str:
    """
    Human-readable order ref, e.g. MRF-20261007-A4F9K2.

    Uses `secrets` (not `random`) and a 6-char alphanumeric suffix so
    collisions are effectively impossible. The model has a unique index
    on `reference`; on the astronomically unlikely collision the insert
    will raise and the caller will get a 500 — but that is now far less
    likely than with a 4-digit random suffix.
    """
    now = datetime.now(timezone.utc)
    suffix = secrets.token_hex(3).upper()  # 6 hex chars
    return f"MRF-{now.strftime('%Y%m%d')}-{suffix}"


def generate_payment_reference(order_reference: str) -> str:
    """
    Unique-per-attempt payment reference.

    Appending a fresh nonce means a customer who retries a failed payment
    gets a new reference, so Paystack does not reject it as a duplicate and
    the unique index on Payment.reference is not violated.
    """
    nonce = secrets.token_hex(4).upper()  # 8 hex chars
    return f"{order_reference}-PAY-{nonce}"