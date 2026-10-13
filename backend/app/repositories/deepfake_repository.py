"""
Deepfake scan persistence — MongoDB repository for deepfake analysis results.
Uses a separate 'deepfake_scans' collection.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from app.core.logging_config import get_logger
from app.db.database import get_db
from app.services.deepfake.schemas import DeepfakeScanResult, DeepfakeScanSummary

logger = get_logger(__name__)
COLLECTION = "deepfake_scans"


def _to_doc(result: DeepfakeScanResult) -> dict:
    """Serialize result to a MongoDB document. Never stores raw video bytes."""
    doc = result.model_dump(mode="json")
    # Remove any temp file paths that may have leaked via findings
    doc.pop("_temp_path", None)
    return doc


async def save_scan(result: DeepfakeScanResult) -> bool:
    """Persist a deepfake scan result. Returns True on success."""
    try:
        db = get_db()
        doc = _to_doc(result)
        await db[COLLECTION].insert_one(doc)
        logger.info("Deepfake scan %s persisted to MongoDB", result.scan_id)
        return True
    except RuntimeError:
        logger.warning("MongoDB not connected — deepfake scan not persisted")
        return False
    except Exception as exc:
        logger.error("Failed to persist deepfake scan %s: %s", result.scan_id, exc)
        return False


async def get_scan(scan_id: str) -> Optional[dict]:
    """Fetch a single deepfake scan document by scan_id."""
    try:
        db = get_db()
        doc = await db[COLLECTION].find_one({"scan_id": scan_id}, {"_id": 0})
        return doc
    except Exception as exc:
        logger.error("Error fetching deepfake scan %s: %s", scan_id, exc)
        return None


async def list_scans(page: int = 1, page_size: int = 20) -> tuple[List[dict], int]:
    """Return paginated list of deepfake scans and total count."""
    try:
        db = get_db()
        skip = (page - 1) * page_size
        total = await db[COLLECTION].count_documents({})
        cursor = (
            db[COLLECTION]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return docs, total
    except Exception as exc:
        logger.error("Error listing deepfake scans: %s", exc)
        return [], 0


async def delete_scan(scan_id: str) -> bool:
    """Delete a deepfake scan document. Returns True if deleted."""
    try:
        db = get_db()
        result = await db[COLLECTION].delete_one({"scan_id": scan_id})
        return result.deleted_count > 0
    except Exception as exc:
        logger.error("Error deleting deepfake scan %s: %s", scan_id, exc)
        return False
