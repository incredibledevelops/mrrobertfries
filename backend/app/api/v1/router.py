from fastapi import APIRouter

from app.api.v1.routers import (
    analytics,
    auth,
    builder,
    categories,
    delivery_zones,
    menu,
    orders,
    payments,
    uploads,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(menu.router)
api_router.include_router(builder.router)
api_router.include_router(delivery_zones.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(analytics.router)
api_router.include_router(uploads.router)