"""MongoDB database connection and collection helpers."""
from __future__ import annotations

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    global _client, _db
    settings = get_settings()
    logger.info("Connecting to MongoDB at %s", settings.mongodb_uri.split("@")[-1])
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    _db = _client[settings.mongodb_database]
    # Verify the connection
    await _client.admin.command("ping")
    logger.info("MongoDB connection established (database: %s)", settings.mongodb_database)
    await _ensure_indexes()


async def disconnect_db() -> None:
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db


async def _ensure_indexes() -> None:
    db = get_db()
    # scans collection indexes
    await db["scans"].create_indexes([
        IndexModel([("scan_id", ASCENDING)], unique=True),
        IndexModel([("created_at", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("risk_category", ASCENDING)]),
    ])
    # deepfake_scans collection indexes
    await db["deepfake_scans"].create_indexes([
        IndexModel([("scan_id", ASCENDING)], unique=True),
        IndexModel([("created_at", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("classification", ASCENDING)]),
    ])
        # scam_scans collection indexes
    await db["scam_scans"].create_indexes([
        IndexModel([("scan_id", ASCENDING)], unique=True),
        IndexModel([("created_at", ASCENDING)]),
        IndexModel([("risk_level", ASCENDING)]),
        IndexModel([("scam_type", ASCENDING)]),
    ])

    # threat_intel_status
    await db["threat_intel_status"].create_indexes([
        IndexModel([("source_name", ASCENDING)], unique=True),
    ])
    # model_registry
    await db["model_registry"].create_indexes([
        IndexModel([("model_name", ASCENDING), ("model_version", ASCENDING)], unique=True),
    ])
    logger.debug("Database indexes ensured")

