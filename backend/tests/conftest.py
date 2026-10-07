import asyncio
import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.main import app
from app.models import ALL_DOCUMENTS

TEST_DB_NAME = "mr_roberts_fries_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _init_test_db():
    from app.core.config import settings

    url = os.getenv("TEST_MONGODB_URL", settings.MONGODB_URL)
    client = AsyncIOMotorClient(url)
    db = client[TEST_DB_NAME]
    await init_beanie(database=db, document_models=ALL_DOCUMENTS)

    # Patch app state so endpoints use test client
    from app.core import database as db_module

    db_module.mongodb.client = client
    db_module.mongodb.db = db

    yield

    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac