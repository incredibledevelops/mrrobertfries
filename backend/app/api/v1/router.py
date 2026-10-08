from fastapi import APIRouter

from app.api.v1.routers import (
    analytics,
    auth,
    branches,
    builder,
    categories,
    customer_account,
    customer_auth,
    delivery_zones,
    kitchen,
    loyalty,
    menu,
    orders,
    payments,
    promo_codes,
    referrals,
    reviews,
    riders,
    search,
    seo,
    uploads,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(customer_auth.router)
api_router.include_router(customer_account.router)
api_router.include_router(branches.router)
api_router.include_router(categories.router)
api_router.include_router(menu.router)
api_router.include_router(search.router)
api_router.include_router(seo.router)
api_router.include_router(builder.router)
api_router.include_router(delivery_zones.router)
api_router.include_router(promo_codes.router)
api_router.include_router(referrals.router)
api_router.include_router(loyalty.router)
api_router.include_router(reviews.router)
api_router.include_router(orders.router)
api_router.include_router(kitchen.router)
api_router.include_router(riders.router)
api_router.include_router(payments.router)
api_router.include_router(analytics.router)
api_router.include_router(uploads.router)