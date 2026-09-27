"""
Settings Router — Step 12 of V1 Specification.

Endpoints:
    GET  /settings?user_id=...   - Fetch user preferences (theme, provider order, stream mode)
    PUT  /settings               - Update user preferences
    POST /settings/clear-history - Bulk clear all conversations for a user (DPDP Act 2023 compliant: audit logs retained)
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from database.connection import get_db
from database.models import default_user_settings, now_utc

router = APIRouter(prefix="/settings", tags=["Settings"])


class UpdateSettingsRequest(BaseModel):
    user_id: str
    theme: Optional[str] = Field("dark", pattern="^(dark|light|system)$")
    preferred_provider_order: Optional[str] = "gemini,groq,cerebras,nvidia,mistral"
    stream_response: Optional[bool] = True
    save_history: Optional[bool] = True


class ClearHistoryRequest(BaseModel):
    user_id: str


@router.get("")
async def get_settings(user_id: str = Query(..., min_length=1)):
    """
    Returns user settings or default values if none exist yet.
    """
    db = get_db()
    settings = await db.settings.find_one({"user_id": user_id})
    if not settings:
        settings = default_user_settings(user_id)

    return {
        "user_id": settings.get("user_id", user_id),
        "theme": settings.get("theme", "dark"),
        "preferred_provider_order": settings.get(
            "preferred_provider_order", "gemini,groq,cerebras,nvidia,mistral"
        ),
        "stream_response": settings.get("stream_response", True),
        "save_history": settings.get("save_history", True),
    }


@router.put("")
async def update_settings(req: UpdateSettingsRequest):
    """
    Upserts user settings.
    """
    db = get_db()
    update_data = {
        "theme": req.theme,
        "preferred_provider_order": req.preferred_provider_order,
        "stream_response": req.stream_response,
        "save_history": req.save_history,
        "updated_at": now_utc(),
    }

    await db.settings.update_one(
        {"user_id": req.user_id},
        {"$set": update_data, "$setOnInsert": {"user_id": req.user_id}},
        upsert=True,
    )

    return {"message": "Settings updated successfully.", "settings": update_data}


@router.post("/clear-history")
async def clear_history(req: ClearHistoryRequest):
    """
    Deletes all conversation documents for the given user_id.
    Note: DPDP Act 2023 requires audit logs to remain in `audit_logs`
    for regulatory compliance and security tracing.
    """
    db = get_db()
    result = await db.conversations.delete_many({"user_id": req.user_id})

    return {
        "message": f"Successfully deleted {result.deleted_count} conversations.",
        "deleted_count": result.deleted_count,
        "user_id": req.user_id,
    }
