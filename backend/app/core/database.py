from typing import List

from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def init_db(document_models: List[type[Document]]) -> None:
    """Initialize MongoDB client and Beanie ODM."""
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]

    # Dev-friendly: allow index dropping so deploys don't fail when a
    # field's unique/settings change. In production we must NOT silently
    # drop indexes — coordinate a migration instead.
    allow_drop = settings.APP_ENV != "production"

    await init_beanie(
        database=mongodb.db,
        document_models=document_models,
        allow_index_dropping=allow_drop,
    )


async def close_db() -> None:
    if mongodb.client:
        mongodb.client.close()
        mongodb.client = None
        mongodb.db = None


def get_database() -> AsyncIOMotorDatabase:
    if mongodb.db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return mongodb.db