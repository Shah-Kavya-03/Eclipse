"""
Internal ML Guardrail Router — Dedicated for Express Gateway communication.

Secured with X-Internal-Secret header.
Endpoints:
    POST /internal/process-chat   - PII masking, threat classification, LLM rotation, output guardrail
    GET  /internal/anomalies      - Isolation Forest anomaly detection
    GET  /internal/report/download - ReportLab DPDP PDF generation stream
"""

import os
import io
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Header, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.connection import get_db
from database.models import new_audit_log
from security.threat_classifier import classify, STATUS_SAFE, STATUS_PII
from security.lime_explainer import explain
from llm.api_router import get_completion, FRIENDLY_CAPACITY_MESSAGE
from ml.anomaly_detector import detect_anomalies
from ml.report_generator import generate_session_report, generate_weekly_report

router = APIRouter(prefix="/internal", tags=["Internal ML Microservice"])


def verify_internal_secret(
    x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret")
):
    """
    Ensures only the Express API Gateway with the shared secret can invoke ML endpoints.
    """
    expected_secret = os.getenv(
        "INTERNAL_SERVICE_KEY", "eclipse_internal_guardrail_secret_key_2026"
    )
    if not x_internal_secret or x_internal_secret != expected_secret:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Invalid or missing internal service secret.",
        )


class HistoryMessage(BaseModel):
    role: str
    content: str


class ProcessChatRequest(BaseModel):
    prompt: str
    session_id: str
    user_id: str = "guest"
    history: Optional[List[HistoryMessage]] = None


@router.post("/process-chat", dependencies=[Depends(verify_internal_secret)])
async def process_chat(req: ProcessChatRequest):
    db = get_db()

    # ---- 1. Classify incoming prompt ----
    input_classification = classify(req.prompt)
    masked_prompt = input_classification["masked_text"]

    # Blocked prompts never reach LLMs
    if input_classification["blocked"]:
        lime_explanation = explain(input_classification)

        await db.audit_logs.insert_one(
            new_audit_log(
                session_id=req.session_id,
                title=req.prompt[:50],
                prompt_masked=masked_prompt,
                response=None,
                model_used=None,
                api_used=None,
                status=input_classification["status"],
                threat_tier=input_classification["threat_tier"],
                lime_explanation=lime_explanation,
                user_id=req.user_id,
            )
        )

        if input_classification["status"] == "Jailbreak":
            await db.anomalies.insert_one(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "reason": "Jailbreak attempt detected",
                    "flagged_at": datetime.now(timezone.utc),
                }
            )

        return {
            "status": input_classification["status"],
            "response": None,
            "blocked_reason": lime_explanation,
            "lime_explanation": lime_explanation,
            "masked_prompt": masked_prompt,
            "model_used": None,
            "api_used": None,
            "threat_tier": input_classification["threat_tier"],
            "blocked": True,
        }

    # ---- 2. Build conversation context ----
    llm_messages = []
    if req.history:
        for msg in req.history[-10:]:
            llm_messages.append({"role": msg.role, "content": msg.content})
    llm_messages.append({"role": "user", "content": masked_prompt})

    # ---- 3. Call LLM rotation ----
    completion = await get_completion(llm_messages)

    if completion["all_rate_limited"]:
        await db.audit_logs.insert_one(
            new_audit_log(
                session_id=req.session_id,
                title=req.prompt[:50],
                prompt_masked=masked_prompt,
                response=None,
                model_used=None,
                api_used=None,
                status="Rate Limited",
                threat_tier=input_classification["threat_tier"],
                lime_explanation=FRIENDLY_CAPACITY_MESSAGE,
                user_id=req.user_id,
            )
        )
        return {
            "status": input_classification["status"],
            "response": None,
            "blocked_reason": FRIENDLY_CAPACITY_MESSAGE,
            "lime_explanation": FRIENDLY_CAPACITY_MESSAGE,
            "masked_prompt": masked_prompt,
            "model_used": None,
            "api_used": None,
            "threat_tier": input_classification["threat_tier"],
            "blocked": True,
        }

    # ---- 4. Classify LLM response ----
    output_classification = classify(completion["text"])
    final_response = output_classification["masked_text"]

    # ---- 5. Record audit log ----
    await db.audit_logs.insert_one(
        new_audit_log(
            session_id=req.session_id,
            title=req.prompt[:50],
            prompt_masked=masked_prompt,
            response=final_response,
            model_used=completion["model_used"],
            api_used=completion["api_used"],
            status="Modified" if input_classification["status"] == STATUS_PII else "Safe",
            threat_tier=input_classification["threat_tier"],
            lime_explanation=None,
            user_id=req.user_id,
        )
    )

    return {
        "status": input_classification["status"],
        "response": final_response,
        "blocked_reason": None,
        "lime_explanation": None,
        "masked_prompt": masked_prompt,
        "model_used": completion["model_used"],
        "api_used": completion["api_used"],
        "threat_tier": input_classification["threat_tier"],
        "blocked": False,
    }


@router.get("/anomalies", dependencies=[Depends(verify_internal_secret)])
async def get_internal_anomalies():
    result = await detect_anomalies(persist=True)
    if result["skipped"]:
        return {
            "message": f"Not enough session data yet (have {result['sessions_analyzed']}, need at least 5).",
            "anomalies": [],
        }
    return {
        "sessions_analyzed": result["sessions_analyzed"],
        "anomalies": result["anomalies_found"],
        "count": len(result["anomalies_found"]),
    }


@router.get("/report/download", dependencies=[Depends(verify_internal_secret)])
async def get_internal_report(
    type: str = Query(..., pattern="^(session|weekly)$"),
    id: Optional[str] = None,
):
    db = get_db()
    if type == "session":
        if not id:
            raise HTTPException(status_code=400, detail="`id` required for session report.")
        pdf_bytes = await generate_session_report(db, id)
        filename = f"guardrail_session_{id}.pdf"
    else:
        pdf_bytes = await generate_weekly_report(db)
        filename = "guardrail_weekly_report.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
