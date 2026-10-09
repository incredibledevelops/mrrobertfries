import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.core.cache import cache
from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.limiter import limiter
from app.models import ALL_DOCUMENTS


def _docs_enabled() -> bool:
    """
    Docs are enabled in development and any non-production env.
    In production they must be explicitly opted-in via DEBUG=true.
    """
    if settings.APP_ENV != "production":
        return True
    return bool(settings.DEBUG)


@asynccontextmanager
async def lifespan(application: FastAPI):
    await init_db(ALL_DOCUMENTS)
    await cache.init()
    for sub in ("menu", "categories", "builder"):
        os.makedirs(os.path.join(settings.UPLOAD_DIR, sub), exist_ok=True)
    yield
    await cache.close()
    await close_db()


_show_docs = _docs_enabled()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Backend API for Mr. Robert's Fries — loaded fries, custom bowls, "
        "orders, Paystack payments & analytics."
    ),
    docs_url="/docs" if _show_docs else None,
    redoc_url="/redoc" if _show_docs else None,
    openapi_url="/openapi.json" if _show_docs else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads",
)


@app.get("/", tags=["Health"])
async def root():
    payload = {
        "name": settings.APP_NAME,
        "env": settings.APP_ENV,
        "status": "ok",
        "cache": cache.enabled,
    }
    if _show_docs:
        payload["docs"] = "/docs"
    return payload


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "cache": cache.enabled}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        import traceback
        traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)