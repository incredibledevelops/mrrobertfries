"""
SEO endpoints served by FastAPI.

Why backend instead of Next.js?
- The sitemap needs to reflect live menu items (which live in MongoDB)
- Serving from the API keeps a single source of truth
- We proxy from Next.js via rewrites so the public URLs stay clean
"""
from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse

from app.core.config import settings
from app.models.menu_item import MenuItem

router = APIRouter(tags=["SEO"])


def _iso_date(dt) -> str:
    if not dt:
        return ""
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return ""


@router.get("/sitemap.xml", response_class=Response)
async def sitemap():
    """Dynamic sitemap — includes homepage, menu items, account pages."""
    site = settings.SITE_URL.rstrip("/")

    # Only include menu items that customers can actually order.
    items = await (
        MenuItem.find(MenuItem.is_available == True)  # noqa: E712
        .sort(+MenuItem.display_order)
        .to_list()
    )

    urls: list[tuple[str, str, str, str]] = [
        # (loc, priority, changefreq, lastmod)
        (f"{site}/", "1.0", "daily", ""),
        (f"{site}/menu", "0.9", "daily", ""),
        (f"{site}/#builder", "0.8", "weekly", ""),
        (f"{site}/#hubs", "0.7", "weekly", ""),
    ]

    for item in items:
        urls.append(
            (
                f"{site}/menu/{item.slug}",
                "0.8",
                "weekly",
                _iso_date(getattr(item, "updated_at", None)),
            )
        )

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url, priority, changefreq, lastmod in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{url}</loc>")
        if lastmod:
            lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")

    xml = "\n".join(lines)
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    site = settings.SITE_URL.rstrip("/")
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin/\n"
        "Disallow: /kitchen/\n"
        "Disallow: /rider/\n"
        "Disallow: /account/\n"
        "Disallow: /order/\n"
        "Disallow: /api/\n"
        "\n"
        f"Sitemap: {site}/sitemap.xml\n"
    )