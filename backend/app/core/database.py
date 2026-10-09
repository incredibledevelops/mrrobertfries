from typing import List
from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def init_db(document_models: List[type[Document]]) -> None:
    """Initialize MongoDB client and Beanie ODM safely."""
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongodb.db = mongodb.client[settings.MDB_NAME if hasattr(settings, "MDB_NAME") else settings.DATABASE_NAME]

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