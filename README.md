# Eclipse — Real-Time LLM Input/Output Guardrail

A comprehensive, full-stack security and governance guardrail system that intercepts, inspects, and moderates user prompts and LLM responses in real time. Eclipse protects against PII leakage, toxic/harmful content, and prompt injection/jailbreak attacks through a multi-tiered security pipeline, automated LLM provider failover across five providers, and DPDP Act 2023 compliant audit logging.

```
Eclipse/
├── backend/                  # Python FastAPI Backend & Security Engine (V1 / Microservice)
├── frontend/                 # Client Chat Interface & Security Dashboard (V1)
├── V2_MERN_STACK_INTEGRATION.txt # Comprehensive MERN Stack & Python Microservice Blueprint (V2)
└── weekly_reports_16_weeks.txt   # 16-Week Project Discussions & Progress Log
```

---

## Architecture & Version Roadmap

### Version 1.0 (Current Stable Release)
* **Backend:** Python 3.11, FastAPI, Uvicorn, MongoDB (Motor async driver), JWT + bcrypt auth.
* **Security Pipeline:**
  * Microsoft Presidio + spaCy (`en_core_web_lg`) for real-time PII anonymization.
  * Detoxify for multi-category toxicity scoring.
  * Five-Tier Threat Classification (Safe, PII Detected, Blocked/Harmful, Injection, Jailbreak).
  * Rule-based heuristic filters for prompt injection & jailbreak detection.
  * LIME-based explainability for blocked prompt telemetry.
* **LLM Provider Rotation:** Self-healing, zero-downtime failover across Google Gemini, Groq, Cerebras, NVIDIA NIM, and Mistral with automatic rate-limit cooldown handling.
* **Compliance & Analytics:** Unsupervised scikit-learn Isolation Forest anomaly detection and ReportLab DPDP Act 2023 compliant PDF report generator (session and weekly audits).
* **Settings & User Management:** User preferences API (`/settings`) and conversation history management.
* **Admin Backend:** Role-gated administration endpoints (`/admin/users`, `/admin/stats`, `/admin/anomalies`, `/admin/user/{id}/flag`).
* **Frontend:** Vanilla HTML5/CSS3/JavaScript chat interface (`index.html`) and real-time security dashboard (`audit.html`).

### Version 2.0 (MERN Stack Architecture Migration — In Progress)
* **API Gateway & Data Management:** Node.js + Express.js + Mongoose managing authentication, conversation CRUD, user preferences, and administrative workflows.
* **Internal ML Microservice:** Decoupled Python FastAPI service (`http://127.0.0.1:8001/internal/*`) dedicated exclusively to ML guardrail evaluation and LLM orchestration.
* **Modern Client UI:** React 18 + Vite frontend migration for enhanced modularity and state management.
* *(See `V2_MERN_STACK_INTEGRATION.txt` for the complete technical blueprint and Mongoose schema definitions).*

### Version 3.0 (Planned Enterprise Enhancements & Deployment)
* **Admin Panel UI:** Dedicated administration frontend dashboard with real-time threat charts, anomaly review workflows, and user moderation controls.
* **Transformer-Based Injection Model:** Integration of the Hugging Face `deepset/deberta-v3-base-injection` transformer model for zero-day semantic injection detection.
* **Production Cloud Deployment:** Multi-tier deployment across Hugging Face Spaces (Python ML service), Render/Railway (Node.js Gateway), Vercel/Netlify (React client), and MongoDB Atlas.

---

## Project Structure

```
Eclipse/
├── backend/
│   ├── main.py                     # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variable template
│   ├── DEPLOYMENT.md               # Cloud deployment documentation
│   ├── database/
│   │   ├── connection.py           # Motor async MongoDB connector
│   │   └── models.py               # Data schema definitions & helpers
│   ├── llm/
│   │   ├── api_router.py           # Provider rotation & self-healing cooldown logic
│   │   ├── gemini_client.py        # Google Generative AI client
│   │   ├── groq_client.py          # Groq OpenAI-compatible client
│   │   ├── cerebras_client.py      # Cerebras client
│   │   ├── nvidia_client.py        # NVIDIA NIM client
│   │   ├── mistral_client.py       # Mistral client
│   │   └── openai_compatible_client.py # Base wrapper for OpenAI-compatible APIs
│   ├── ml/
│   │   ├── anomaly_detector.py     # Isolation Forest unsupervised anomaly detector
│   │   └── report_generator.py     # ReportLab DPDP-compliant PDF export engine
│   ├── routers/
│   │   ├── auth.py                 # JWT signup, login, logout
│   │   ├── chat.py                 # Core /chat guardrail pipeline
│   │   ├── conversations.py        # Session listing, message history, title renaming
│   │   ├── settings.py             # User preferences & bulk history deletion
│   │   ├── logs.py                 # Audit logs & dashboard analytics
│   │   ├── admin.py                # Role-gated admin management
│   │   ├── anomalies.py            # Flagged sessions & anomaly endpoints
│   │   ├── reports.py              # PDF report download stream
│   │   └── health.py               # API health check
│   ├── security/
│   │   ├── pii_detector.py         # Microsoft Presidio PII masker
│   │   ├── toxicity_scorer.py      # Detoxify neural toxicity scorer
│   │   ├── injection_detector.py   # Regex & heuristic prompt injection guard
│   │   ├── threat_classifier.py    # Five-tier threat classification engine
│   │   └── lime_explainer.py       # Interpretability engine for blocked prompts
│   └── utils/
│       └── auth.py                 # Password hashing & JWT dependencies
└── frontend/
    ├── index.html                  # Chat interface
    ├── audit.html                  # Security telemetry & audit dashboard
    ├── css/                        # Modular stylesheet definitions
    └── js/                         # Frontend client scripts & API fetch wiring
```

---

## Local Setup & Installation

### 1. Prerequisites
* Python 3.11+
* MongoDB Community Server (running locally at `mongodb://localhost:27017`) or MongoDB Atlas URI

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS / Linux

# Install dependencies and spaCy language model
pip install -r requirements.txt --no-cache-dir
python -m spacy download en_core_web_lg

# Configure environment variables
copy .env.example .env       # Windows
cp .env.example .env         # macOS / Linux
```

Fill in your `.env` with your MongoDB connection string and at least one active LLM API key.

### 3. Launch Backend Server
```bash
uvicorn main:app --reload --port 8000
```
Verify the server status at `http://localhost:8000/health` or view interactive API documentation at `http://localhost:8000/docs`.

### 4. Launch Frontend
Open `frontend/index.html` directly in any modern browser, or serve it via a local static server.

---

## Security & Compliance Principles

1. **Zero Raw PII Persistence:** Sensitive user data is sanitized via Microsoft Presidio before storing conversation records or audit logs, satisfying DPDP Act 2023 data minimization mandates.
2. **Deterministic Pre-Inference Blocking:** Injections and severe toxicity are halted prior to reaching LLM context windows, eliminating prompt injection risks and reducing external API billing.
3. **Failover Resilience:** When free-tier rate limits (HTTP 429) occur, requests automatically route to secondary providers without user disruption.
4. **Environment Isolation:** All secret keys and `.env` credentials remain strictly excluded from source control.
