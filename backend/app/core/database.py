# OLD (Motor - no longer compatible with Beanie 2.x)
# from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
# client = AsyncIOMotorClient(settings.MONGODB_URL)

# NEW (PyMongo async client - Beanie 2.x compatible)
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from beanie import init_beanie
from app.core.config import settings


class MongoDB:
    client: AsyncMongoClient | None = None
    db: AsyncDatabase | None = None


mongodb = MongoDB()


async def init_db(document_models: list) -> None:
    """Initialize MongoDB client and Beanie ODM."""
    mongodb.client = AsyncMongoClient(settings.MONGODB_URL)
    mongodb.db = mongodb.client[settings.MONGODB_DB_NAME]

    allow_drop = settings.APP_ENV != "production"

    await init_beanie(
        database=mongodb.db,
        document_models=document_models,
        allow_index_dropping=allow_drop,
    )


async def close_db() -> None:
    if mongodb.client:
        await mongodb.client.close()
        mongodb.client = None
        mongodb.db = None


def get_database() -> AsyncDatabase:
    if mongodb.db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return mongodb.db