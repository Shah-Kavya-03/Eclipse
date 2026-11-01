"""
PII detection and masking using Microsoft Presidio.

CRITICAL: the output of mask_pii() is the ONLY version of a prompt
that may ever be stored in MongoDB or logged anywhere (DPDP Act 2023
compliance — see database/models.py). Raw prompts never touch disk.
"""

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# Explicitly configure Presidio to use the lightweight en_core_web_sm (12MB)
# model pre-installed in Docker, rather than the default en_core_web_lg (400MB)
# which exceeds cloud free tier RAM (512MB limit).
_nlp_configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
_provider = NlpEngineProvider(nlp_configuration=_nlp_configuration)
_nlp_engine = _provider.create_engine()

_analyzer = AnalyzerEngine(nlp_engine=_nlp_engine, supported_languages=["en"])
_anonymizer = AnonymizerEngine()

# Entities we actively look for on user inputs (DPDP Act 2023 compliance).
INPUT_PII_ENTITIES = [
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
# Kept for backward compatibility
PII_ENTITIES = INPUT_PII_ENTITIES

# Entities for outgoing LLM responses: Strictly high-risk sensitive data
# (government IDs, financial credentials, phone numbers).
# Excludes PERSON (public figures/authors), LOCATION (cities/countries/tech hubs),
# DATE_TIME (years/timestamps), and IP_ADDRESS (localhost/127.0.0.1 in code) to prevent nonsensical redactions.
OUTPUT_PII_ENTITIES = [
    "CREDIT_CARD",
    "US_SSN",
    "IN_AADHAAR",
    "IN_PAN",
    "PHONE_NUMBER",
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


def mask_pii(text: str, is_output: bool = False) -> dict:
    """
    Detect and mask PII in `text` with descriptive, understandable placeholders.
    When is_output=True, only high-risk identifiers (government IDs, financial data, phone numbers)
    are evaluated to avoid nonsensical redactions on general knowledge, dates, names, and locations.

    Returns:
        {
            "masked_text": str,          # safe to store/log
            "pii_found": bool,
            "entities_found": [str, ...], # list of entity type strings, e.g. ["EMAIL_ADDRESS"]
            "entities_detected": [...]    # metadata for DB auditing
        }
    """
    entities_to_check = OUTPUT_PII_ENTITIES if is_output else INPUT_PII_ENTITIES

    results = _analyzer.analyze(
        text=text,
        entities=entities_to_check,
        language="en",
        score_threshold=0.6,
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
