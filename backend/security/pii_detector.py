"""
PII detection and masking using Microsoft Presidio.

CRITICAL: the output of mask_pii() is the ONLY version of a prompt
that may ever be stored in MongoDB or logged anywhere (DPDP Act 2023
compliance — see database/models.py). Raw prompts never touch disk.
"""

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# These are loaded once at import time (model loading is slow) and
# reused across every request.
_analyzer = AnalyzerEngine()
_anonymizer = AnonymizerEngine()

# Entities we actively look for. Presidio supports many more; this
# list covers what DPDP Act 2023 cares about most for a chat app.
PII_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "US_SSN",
    "IN_AADHAAR",
    "IN_PAN",
    "LOCATION",
    "IP_ADDRESS",
    "DATE_TIME",
]


ENTITY_LABELS = {
    "PERSON": "<PERSON_NAME>",
    "EMAIL_ADDRESS": "<EMAIL_ADDRESS>",
    "PHONE_NUMBER": "<PHONE_NUMBER>",
    "CREDIT_CARD": "<CREDIT_CARD>",
    "US_SSN": "<SSN_NUMBER>",
    "IN_AADHAAR": "<AADHAAR_NUMBER>",
    "IN_PAN": "<PAN_CARD_NUMBER>",
    "LOCATION": "<LOCATION>",
    "IP_ADDRESS": "<IP_ADDRESS>",
    "DATE_TIME": "<DATE_TIME>",
}


def mask_pii(text: str) -> dict:
    """
    Detect and mask PII in `text` with descriptive, understandable placeholders.

    Returns:
        {
            "masked_text": str,          # safe to store/log
            "pii_found": bool,
            "entities_found": [str, ...], # list of entity type strings, e.g. ["EMAIL_ADDRESS"]
            "entities_detected": [...]    # metadata for DB auditing
        }
    """
    results = _analyzer.analyze(
        text=text,
        entities=PII_ENTITIES,
        language="en",
    )

    if not results:
        return {
            "masked_text": text,
            "pii_found": False,
            "entities_found": [],
            "entities_detected": [],
        }

    # Build operator dictionary with descriptive placeholders for each entity type
    operators = {
        entity_type: OperatorConfig("replace", {"new_value": label})
        for entity_type, label in ENTITY_LABELS.items()
    }
    operators["DEFAULT"] = OperatorConfig("replace", {"new_value": "<REDACTED_PII>"})

    anonymized = _anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators=operators,
    )

    entities_found = sorted({r.entity_type for r in results})
    entities_detected = [
        {
            "entity_type": r.entity_type,
            "placeholder": ENTITY_LABELS.get(r.entity_type, f"<{r.entity_type}>"),
            "confidence": round(r.score, 3),
        }
        for r in results
    ]

    return {
        "masked_text": anonymized.text,
        "pii_found": True,
        "entities_found": entities_found,
        "entities_detected": entities_detected,
    }
