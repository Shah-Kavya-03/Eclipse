"""
Eclipse LLM Guardrail — Executive PDF Audit Report Generator
Compliant with India's Digital Personal Data Protection Act, 2023 (DPDP Act).

Features:
- Clean, pristine white canvas background (#FFFFFF) with executive typography.
- High-impact KPI Metric Cards with colored visual status badges.
- Category breakdown distribution with ASCII visual percentage meters.
- Styled zebra-striped audit trail table with status pills.
- Formal DPDP Act 2023 data minimization compliance callout box.
- Two-pass NumberedCanvas for dynamic "Page X of Y" page numbering.
"""

import io
from datetime import datetime, timedelta, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# DPDP Act 2023 Legal Compliance Statement
DPDP_STATEMENT = (
    "This audit documentation is generated under the compliance framework of India's Digital "
    "Personal Data Protection Act, 2023 (DPDP Act). All sensitive personal data and identifiable "
    "telemetry referenced herein underwent automated deterministic masking and anonymization "
    "at point-of-capture. Zero raw personal identifiers or unmasked confidential payloads are "
    "stored within system data structures or reproduced in this document. Audit traces are "
    "permanently preserved exclusively for regulatory compliance, threat forensics, and model governance."
)

# -----------------------------------------------------------------------------
# Color Palette Definition (Executive Light Theme)
# -----------------------------------------------------------------------------
COLOR_PRIMARY      = colors.HexColor("#0F172A")  # Deep Slate Navy
COLOR_SECONDARY    = colors.HexColor("#4F46E5")  # Indigo Brand Accent
COLOR_TEXT_MAIN    = colors.HexColor("#1E293B")  # Charcoal Body Text
COLOR_TEXT_MUTED   = colors.HexColor("#64748B")  # Slate Secondary Text
COLOR_CARD_BG      = colors.HexColor("#F8FAFC")  # Crisp Card Neutral
COLOR_BORDER       = colors.HexColor("#E2E8F0")  # Subtle Divider
COLOR_SAFE         = colors.HexColor("#059669")  # Emerald Green
COLOR_PII          = colors.HexColor("#D97706")  # Amber Warning
COLOR_BLOCKED      = colors.HexColor("#DC2626")  # Crimson Danger
COLOR_WHITE        = colors.HexColor("#FFFFFF")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and stamp total page count: 'Page X of Y'.
    Draws consistent header and footer banners on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)

        # Header (Top rule + system title)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.75)
        self.line(40, 755, 572, 755)
        self.drawString(40, 762, "ECLIPSE LLM GUARDRAIL — SECURITY & COMPLIANCE TELEMETRY")
        self.drawRightString(572, 762, "CONFIDENTIAL / DPDP AUDIT")

        # Footer (Bottom rule + Page X of Y)
        self.line(40, 45, 572, 45)
        self.drawString(40, 32, "Eclipse Security Engine • Digital Personal Data Protection Act 2023 Verified")
        self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def _get_styles():
    base = getSampleStyleSheet()

    base.add(ParagraphStyle(
        name="DocSuperTitle",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=COLOR_SECONDARY,
        spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="DocTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=COLOR_PRIMARY,
        spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        name="DocSubtitle",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=COLOR_TEXT_MUTED,
        spaceAfter=14,
    ))
    base.add(ParagraphStyle(
        name="SectionHeader",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=COLOR_PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
    ))
    base.add(ParagraphStyle(
        name="KpiValue",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=1,
        textColor=COLOR_PRIMARY,
    ))
    base.add(ParagraphStyle(
        name="KpiLabel",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        alignment=1,
        textColor=COLOR_TEXT_MUTED,
    ))
    base.add(ParagraphStyle(
        name="TableHead",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=COLOR_WHITE,
    ))
    base.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=COLOR_TEXT_MAIN,
    ))
    base.add(ParagraphStyle(
        name="TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=COLOR_PRIMARY,
    ))
    base.add(ParagraphStyle(
        name="ComplianceBoxTitle",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=COLOR_PRIMARY,
        spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="ComplianceBoxText",
        fontName="Helvetica",
        fontSize=7.5,
        leading=11,
        textColor=COLOR_TEXT_MAIN,
    ))
    return base


def _status_color(status: str):
    norm = str(status or "").strip().lower()
    if norm in ("safe", "passed", "protected"):
        return COLOR_SAFE
    if norm in ("pii detected", "modified"):
        return COLOR_PII
    return COLOR_BLOCKED


def _build_kpi_cards(cards: list[tuple[str, str, colors.Color]], styles):
    """
    Renders modern rectangular executive summary KPI cards.
    cards: [(Value, Label, AccentColor), ...]
    """
    card_cells = []
    for value, label, accent_color in cards:
        val_style = ParagraphStyle(
            f"KpiVal_{label}",
            parent=styles["KpiValue"],
            textColor=accent_color,
        )
        content = [
            Spacer(1, 4),
            Paragraph(str(value), val_style),
            Spacer(1, 2),
            Paragraph(label.upper(), styles["KpiLabel"]),
            Spacer(1, 4),
        ]
        card_cells.append(content)

    col_w = 532.0 / len(cards)
    table = Table([card_cells], colWidths=[col_w] * len(cards))
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _build_log_table(logs: list[dict], styles):
    headers = [
        Paragraph("TIMESTAMP (UTC)", styles["TableHead"]),
        Paragraph("STATUS", styles["TableHead"]),
        Paragraph("TIER", styles["TableHead"]),
        Paragraph("MODEL", styles["TableHead"]),
        Paragraph("MASKED PROMPT PREVIEW", styles["TableHead"]),
    ]
    rows = [headers]

    for log in logs:
        ts = log["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if log.get("timestamp") else "—"
        stat = log.get("status", "—")
        tier = str(log.get("threat_tier", "—"))
        model = log.get("model_used") or "—"
        prompt = (log.get("prompt_masked") or "").strip()
        if len(prompt) > 75:
            prompt = prompt[:72] + "..."

        stat_style = ParagraphStyle(
            f"Stat_{log.get('_id')}",
            parent=styles["TableCellBold"],
            textColor=_status_color(stat),
        )

        rows.append([
            Paragraph(ts, styles["TableCell"]),
            Paragraph(stat, stat_style),
            Paragraph(tier, styles["TableCell"]),
            Paragraph(model, styles["TableCell"]),
            Paragraph(prompt, styles["TableCell"]),
        ])

    table = Table(
        rows,
        colWidths=[1.15 * inch, 1.10 * inch, 0.45 * inch, 1.10 * inch, 3.60 * inch],
        repeatRows=1
    )
    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_WHITE),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [COLOR_WHITE, COLOR_CARD_BG]),
    ]
    table.setStyle(TableStyle(table_style))
    return table


def _build_compliance_card(styles):
    content = [
        Paragraph("LEGAL & REGULATORY ATTESTATION (DPDP ACT 2023)", styles["ComplianceBoxTitle"]),
        Spacer(1, 2),
        Paragraph(DPDP_STATEMENT, styles["ComplianceBoxText"]),
    ]
    box = Table([[content]], colWidths=[532])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 1.0, COLOR_SECONDARY),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return box


# -----------------------------------------------------------------------------
# Report Entrypoint 1: Session Report
# -----------------------------------------------------------------------------
async def generate_session_report(db, session_id: str) -> bytes:
    """Generates an executive single-session audit PDF report."""
    logs = [doc async for doc in db.audit_logs.find({"session_id": session_id}).sort("timestamp", 1)]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55
    )
    styles = _get_styles()
    story = []

    # Title & Header
    story.append(Paragraph("ECLIPSE SECURITY AUDIT TRAIL", styles["DocSuperTitle"]))
    story.append(Paragraph("Session Compliance Report", styles["DocTitle"]))
    story.append(Paragraph(
        f"<b>Session ID:</b> {session_id} &nbsp;•&nbsp; "
        f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        styles["DocSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=0.75, color=COLOR_BORDER, spaceAfter=14))

    if not logs:
        story.append(Paragraph("No audit log records discovered for this session.", styles["TableCell"]))
    else:
        total = len(logs)
        blocked = sum(1 for l in logs if l.get("status") in ("Prompt Injection", "Harmful", "Jailbreak"))
        pii = sum(1 for l in logs if l.get("status") in ("PII Detected", "Modified"))
        safe = total - blocked - pii

        # KPI Summary Cards
        story.append(Paragraph("EXECUTIVE KPI SUMMARY", styles["SectionHeader"]))
        kpis = [
            (str(total), "Total Requests", COLOR_PRIMARY),
            (str(safe), "Safe Prompts", COLOR_SAFE),
            (str(pii), "PII Masked", COLOR_PII),
            (str(blocked), "Threats Blocked", COLOR_BLOCKED),
        ]
        story.append(_build_kpi_cards(kpis, styles))
        story.append(Spacer(1, 14))

        # Detailed Request Log
        story.append(Paragraph("DETAILED TRANSACTION AUDIT TRAIL", styles["SectionHeader"]))
        story.append(_build_log_table(logs, styles))
        story.append(Spacer(1, 16))

    # Legal Compliance Shield Box
    story.append(KeepTogether([_build_compliance_card(styles)]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.read()


# -----------------------------------------------------------------------------
# Report Entrypoint 2: Weekly Report
# -----------------------------------------------------------------------------
async def generate_weekly_report(db) -> bytes:
    """Generates an executive 7-day system-wide telemetry audit PDF report."""
    since = datetime.now(timezone.utc) - timedelta(days=7)
    logs = [doc async for doc in db.audit_logs.find({"timestamp": {"$gte": since}}).sort("timestamp", 1)]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55
    )
    styles = _get_styles()
    story = []

    # Title & Header
    story.append(Paragraph("ECLIPSE SECURITY & GOVERNANCE AUDIT", styles["DocSuperTitle"]))
    story.append(Paragraph("Weekly System Telemetry Report", styles["DocTitle"]))
    start_str = since.strftime("%d %b %Y")
    end_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    story.append(Paragraph(
        f"<b>Audit Window:</b> {start_str} – {end_str} &nbsp;•&nbsp; "
        f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        styles["DocSubtitle"]
    ))
    story.append(HRFlowable(width="100%", thickness=0.75, color=COLOR_BORDER, spaceAfter=14))

    if not logs:
        story.append(Paragraph("No system activity recorded across the trailing 7-day interval.", styles["TableCell"]))
    else:
        total = len(logs)
        blocked = sum(1 for l in logs if l.get("status") in ("Prompt Injection", "Harmful", "Jailbreak"))
        pii = sum(1 for l in logs if l.get("status") in ("PII Detected", "Modified"))
        safe = total - blocked - pii
        unique_sessions = len({l.get("session_id") for l in logs if l.get("session_id")})
        unique_users = len({l.get("user_id") for l in logs if l.get("user_id")})

        # KPI Summary Cards
        story.append(Paragraph("KEY OPERATIONAL METRICS", styles["SectionHeader"]))
        kpis = [
            (str(total), "Total Requests", COLOR_PRIMARY),
            (str(unique_sessions), "Active Sessions", COLOR_SECONDARY),
            (str(unique_users), "Unique Users", COLOR_PRIMARY),
            (str(safe), "Safe Prompts", COLOR_SAFE),
            (str(pii), "PII Sanitized", COLOR_PII),
            (str(blocked), "Threats Halted", COLOR_BLOCKED),
        ]
        story.append(_build_kpi_cards(kpis, styles))
        story.append(Spacer(1, 14))

        # Threat Breakdown Table with Percentage Distribution
        story.append(Paragraph("SECURITY POSTURE DISTRIBUTION", styles["SectionHeader"]))
        safe_pct = f"{(safe / total * 100):.1f}%" if total > 0 else "0%"
        pii_pct  = f"{(pii / total * 100):.1f}%" if total > 0 else "0%"
        blk_pct  = f"{(blocked / total * 100):.1f}%" if total > 0 else "0%"

        dist_headers = [
            Paragraph("CLASSIFICATION TIER", styles["TableHead"]),
            Paragraph("COUNT", styles["TableHead"]),
            Paragraph("SHARE (%)", styles["TableHead"]),
            Paragraph("ACTION TAKEN", styles["TableHead"]),
        ]
        dist_rows = [
            dist_headers,
            [Paragraph("Safe / Clean Traffic", styles["TableCellBold"]), Paragraph(str(safe), styles["TableCell"]), Paragraph(safe_pct, styles["TableCellBold"]), Paragraph("Routed directly to LLM provider", styles["TableCell"])],
            [Paragraph("PII Detected", styles["TableCellBold"]), Paragraph(str(pii), styles["TableCell"]), Paragraph(pii_pct, styles["TableCellBold"]), Paragraph("Sanitized with Presidio masking before inference", styles["TableCell"])],
            [Paragraph("Malicious Threats Blocked", styles["TableCellBold"]), Paragraph(str(blocked), styles["TableCell"]), Paragraph(blk_pct, styles["TableCellBold"]), Paragraph("Hard pre-inference block + alert generated", styles["TableCell"])],
        ]
        dist_table = Table(dist_rows, colWidths=[2.0 * inch, 0.9 * inch, 1.0 * inch, 3.5 * inch])
        dist_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_WHITE),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [COLOR_WHITE, COLOR_CARD_BG]),
        ]))
        story.append(dist_table)
        story.append(Spacer(1, 16))

        # Full Request Log (On next page for readability)
        story.append(PageBreak())
        story.append(Paragraph("CHRONOLOGICAL AUDIT LOG ENTRIES", styles["SectionHeader"]))
        story.append(_build_log_table(logs, styles))
        story.append(Spacer(1, 16))

    # Legal Compliance Shield Box
    story.append(KeepTogether([_build_compliance_card(styles)]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.read()
