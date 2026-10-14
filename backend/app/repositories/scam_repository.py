"""Privacy-preserving storage: raw message text is never persisted."""
from app.db.database import get_db
from app.schemas.scam_schemas import ScamResult, ScamHistory

class ScamRepository:
    async def save(self, result: ScamResult) -> bool:
        try:
            doc = result.model_dump(mode="json")
            # Evidence excerpts could contain secrets, so do not persist them.
            for indicator in doc["indicators"]:
                indicator["excerpt"] = "[redacted]"
            doc["_id"] = result.scan_id
            doc["stored"] = True
            await get_db()["scam_scans"].replace_one({"_id": result.scan_id}, doc, upsert=True)
            return True
        except Exception:
            return False

    async def list(self, page: int, page_size: int) -> ScamHistory:
        db = get_db()
        total = await db["scam_scans"].count_documents({})
        docs = await db["scam_scans"].find({}, {"_id": 0}).sort("created_at", -1).skip((page-1)*page_size).limit(page_size).to_list(length=page_size)
        return ScamHistory(items=[ScamResult(**x) for x in docs], total=total, page=page, page_size=page_size)

    async def delete(self, scan_id: str) -> bool:
        return (await get_db()["scam_scans"].delete_one({"_id": scan_id})).deleted_count > 0
