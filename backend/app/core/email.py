"""
Email helper using Resend.

If RESEND_API_KEY is empty, emails are logged to the console instead of sent —
so development works without a Resend account.
"""
import logging
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _resend_client():
    """Lazily import resend so the app starts even if package missing."""
    try:
        import resend  # type: ignore
        resend.api_key = settings.RESEND_API_KEY
        return resend
    except ImportError:
        logger.warning("resend package not installed — emails will be logged only")
        return None


def render_template(name: str, context: dict) -> str:
    template = _env.get_template(name)
    return template.render(**context)


async def send_email(
    to: str,
    subject: str,
    html: str,
    from_override: Optional[str] = None,
) -> bool:
    """
    Send an email via Resend. Returns True on success.

    If RESEND_API_KEY isn't configured, logs the email and returns False
    (so the caller knows it was skipped, but the app doesn't crash).
    """
    if not settings.RESEND_API_KEY:
        logger.info(
            "[EMAIL SKIPPED — no RESEND_API_KEY] to=%s subject=%s", to, subject
        )
        return False

    client = _resend_client()
    if client is None:
        return False

    try:
        client.Emails.send({
            "from": from_override or settings.MAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("[EMAIL SENT] to=%s subject=%s", to, subject)
        return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False


async def send_order_receipt(order) -> bool:
    """
    Send an order receipt email. `order` is an app.models.order.Order instance.
    """
    items_rows = "".join(
        f"""
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">{item.name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">{item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">
            GH₵ {item.unit_price * item.quantity:.2f}
          </td>
        </tr>
        """
        for item in order.items
    )

    # NOTE: link points at the frontend order-tracking page.
    # `settings.FRONTEND_URL` defaults to http://localhost:3000 in dev
    # and must be set to the public origin (e.g. https://mrfries.com)
    # in production.
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    html = render_template(
        "receipt.html",
        {
            "customer_name": order.customer.full_name,
            "reference": order.reference,
            "items_rows": items_rows,
            "subtotal": f"{order.subtotal:.2f}",
            "delivery_fee": f"{order.delivery_fee:.2f}",
            "total": f"{order.total:.2f}",
            "delivery_zone": order.delivery_zone_name,
            "delivery_address": order.delivery_address,
            "frontend_url": frontend_url,
        },
    )

    return await send_email(
        to=order.customer.email,
        subject=f"Your Mr. Robert's Fries order {order.reference} is confirmed 🍟",
        html=html,
    )