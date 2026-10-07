import hashlib
import hmac
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings


class PaystackError(Exception):
    def __init__(self, message: str, status_code: int = 400, payload: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload


class PaystackClient:
    """Thin async wrapper around the Paystack REST API."""

    def __init__(
        self,
        secret_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 20.0,
    ):
        self.secret_key = secret_key or settings.PAYSTACK_SECRET_KEY
        self.base_url = (base_url or settings.PAYSTACK_BASE_URL).rstrip("/")
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self, method: str, path: str, **kwargs
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method, url, headers=self._headers(), **kwargs
            )

        try:
            data = response.json()
        except Exception:
            data = {"raw": response.text}

        if response.status_code >= 400 or not data.get("status", True):
            raise PaystackError(
                data.get("message", "Paystack request failed"),
                status_code=response.status_code,
                payload=data,
            )
        return data

    async def initialize_transaction(
        self,
        email: str,
        amount_pesewas: int,
        reference: str,
        currency: str = "GHS",
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        channels: Optional[list] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "email": email,
            "amount": amount_pesewas,
            "reference": reference,
            "currency": currency,
        }
        if callback_url or settings.PAYSTACK_CALLBACK_URL:
            payload["callback_url"] = callback_url or settings.PAYSTACK_CALLBACK_URL
        if metadata:
            payload["metadata"] = metadata
        if channels:
            payload["channels"] = channels

        return await self._request("POST", "/transaction/initialize", json=payload)

    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        return await self._request("GET", f"/transaction/verify/{reference}")

    async def list_transactions(
        self, per_page: int = 50, page: int = 1
    ) -> Dict[str, Any]:
        return await self._request(
            "GET",
            "/transaction",
            params={"perPage": per_page, "page": page},
        )

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Paystack's HMAC SHA512 webhook signature."""
        if not signature:
            return False
        computed = hmac.new(
            self.secret_key.encode("utf-8"),
            payload,
            hashlib.sha512,
        ).hexdigest()
        return hmac.compare_digest(computed, signature)


paystack_client = PaystackClient()