"""Database repository for scan persistence."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.db.database import get_db
from app.schemas.scan_schemas import PaginatedScans, ScanResult, ScanStatus, ScanSummary

logger = logging.getLogger(__name__)

COLLECTION = "scans"


class ScanRepository:
    async def save(self, scan: ScanResult) -> bool:
        try:
            db = get_db()
            doc = scan.model_dump(mode="json")
            doc["_id"] = scan.scan_id
            await db[COLLECTION].replace_one({"_id": scan.scan_id}, doc, upsert=True)
            return True
        except Exception as exc:
            logger.error("Failed to save scan %s: %s", scan.scan_id, exc)
            return False

    async def get_by_id(self, scan_id: str) -> Optional[ScanResult]:
        try:
            db = get_db()
            doc = await db[COLLECTION].find_one({"_id": scan_id})
            if doc:
                doc.pop("_id", None)
                return ScanResult(**doc)
        except Exception as exc:
            logger.error("Failed to retrieve scan %s: %s", scan_id, exc)
        return None

    async def list_scans(self, page: int = 1, page_size: int = 20) -> PaginatedScans:
        try:
            db = get_db()
            skip = (page - 1) * page_size
            total = await db[COLLECTION].count_documents({})
            cursor = db[COLLECTION].find(
                {}, {"scan_id": 1, "status": 1, "risk_category": 1,
                     "normalized_hostname": 1, "created_at": 1,
                     "processing_duration_ms": 1, "threat_intel_result": 1,
                     "ml_result": 1}
            ).sort("created_at", -1).skip(skip).limit(page_size)
            docs = await cursor.to_list(length=page_size)
            items = []
            for doc in docs:
                ti = doc.get("threat_intel_result") or {}
                ml = doc.get("ml_result") or {}
                items.append(ScanSummary(
                    scan_id=doc.get("scan_id", ""),
                    status=doc.get("status", ScanStatus.COMPLETED),
                    risk_category=doc.get("risk_category"),
                    normalized_hostname=doc.get("normalized_hostname"),
                    created_at=doc.get("created_at"),
                    processing_duration_ms=doc.get("processing_duration_ms"),
                    threat_intel_matched=ti.get("matched", False),
                    ml_score=ml.get("model_score"),
                ))
            total_pages = max(1, (total + page_size - 1) // page_size)
            return PaginatedScans(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)
        except Exception as exc:
            logger.error("Failed to list scans: %s", exc)
            return PaginatedScans(items=[], total=0, page=page, page_size=page_size, total_pages=1)

    async def delete(self, scan_id: str) -> bool:
        try:
            db = get_db()
            result = await db[COLLECTION].delete_one({"_id": scan_id})
            return result.deleted_count > 0
        except Exception as exc:
            logger.error("Failed to delete scan %s: %s", scan_id, exc)
            return False

    async def get_stats(self) -> dict:
        try:
            db = get_db()
            pipeline = [
                {"$group": {
                    "_id": "$risk_category",
                    "count": {"$sum": 1},
                    "ti_matches": {"$sum": {"$cond": [{"$eq": ["$threat_intel_result.matched", True]}, 1, 0]}},
                }}
            ]
            cursor = db[COLLECTION].aggregate(pipeline)
            docs = await cursor.to_list(length=20)
            stats = {"total": 0, "phishing": 0, "suspicious": 0, "safe": 0, "inconclusive": 0, "threat_intel_matches": 0}
            for doc in docs:
                cat = doc.get("_id") or "inconclusive"
                count = doc.get("count", 0)
                stats["total"] += count
                if cat in stats:
                    stats[cat] += count
                stats["threat_intel_matches"] += doc.get("ti_matches", 0)
            return stats
        except Exception as exc:
            logger.error("Failed to get stats: %s", exc)
            return {"total": 0, "phishing": 0, "suspicious": 0, "safe": 0, "inconclusive": 0, "threat_intel_matches": 0}
