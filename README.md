# Eclipse — Real-Time LLM Input/Output Guardrail & Governance Platform

A high-performance, enterprise-grade security and compliance guardrail platform that intercepts, sanitizes, and evaluates user prompts and LLM completions in real time. Eclipse shields generative AI applications against Prompt Injection, Jailbreak exploits, PII data leakage, and toxic content through a hybrid ML/rule-based cascade, automated 5-provider LLM failover, and audit reporting compliant with India's Digital Personal Data Protection Act, 2023 (DPDP Act).

---

## System Architecture (4-Tier Production Topology)

```
┌─────────────────────────────────┐     ┌───────────────────────────────────┐
│ User Frontend (React 18 + Vite) │     │ Admin Dashboard (React 18 + Vite) │
│       http://localhost:5173     │     │        http://localhost:5174      │
└────────────────┬────────────────┘     └─────────────────┬─────────────────┘
                 │                                        │
                 ▼                                        ▼
    ┌─────────────────────────────────────────────────────────────┐
    │       Express API Gateway (Node.js + Mongoose + JWT)        │
    │                    http://localhost:5000                    │
    └──────────────┬──────────────────────────────┬───────────────┘
                   │ (MongoDB Native Auth/CRUD)   │ (X-Internal-Secret Header)
                   ▼                              ▼
    ┌─────────────────────────────┐   ┌──────────────────────────────────────────────┐
    │ MongoDB (Local / Atlas)     │   │ Python ML Microservice (FastAPI + PyTorch)   │
    │ mongodb://localhost:27017   │   │            http://127.0.0.1:8001             │
    └─────────────────────────────┘   └──────────────────────┬───────────────────────┘
                                                             │
                                   ┌─────────────────────────┴─────────────────────────┐
                                   ▼                                                   ▼
                     [Security Defense Pipeline]                          [Automated LLM Failover]
                     • Microsoft Presidio (PII Masking)                   • Google Gemini (gemini-3.8-flash)
                     • Detoxify (Neural Toxicity Scoring)                 • Groq (Llama 3.3 70B / 3.1 8B)
                     • DeBERTa-v3 / Heuristics (Injection/Jailbreak)      • Cerebras (Llama 3.1 8B / 3.3 70B)
                     • Isolation Forest (Anomaly Detection)               • NVIDIA NIM (Mistral NeMo 12B)
                     • ReportLab (DPDP 2023 Executive PDFs)               • Mistral AI (Mistral Small)
```

| Service | Technology | Port / URL | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **User Frontend** | React 18, Vite, Lucide/FontAwesome | `http://localhost:5173` | Guarded conversational interface, real-time telemetry pill displays, account modal |
| **Admin Dashboard**| React 18, Vite, Chart.js | `http://localhost:5174` | Security operations dashboard, anomaly triage, audit log explorer, user moderation |
| **API Gateway** | Node.js, Express, Mongoose, JWT | `http://localhost:5000` | Client authentication, session & conversation CRUD, admin endpoints, rate limiting |
| **ML Microservice**| Python 3.11, FastAPI, PyTorch | `http://127.0.0.1:8001` | PII masking, threat classification, injection detection, LLM routing, PDF generation |
| **Database** | MongoDB 7+ / Atlas | `localhost:27017` | Persistent users, conversation histories, audit logs, and security anomalies |

---

## Core Capabilities & Security Pipeline

### 1. Hybrid Cascade Prompt Injection & Jailbreak Detector
Eclipse features a two-stage hybrid cascade for sub-millisecond evaluation and deep semantic threat blocking:
* **Stage 1 (Regex Heuristic Fast-Path):** Detects known prompt injection patterns and jailbreak signatures in $<1\text{ ms}$.
* **Stage 2 (Deep Semantic Transformer):** Powered by `protectai/deberta-v3-base-prompt-injection-v2` (`INJECTION_DETECTOR_MODE=ml`). Captures paraphrased, obfuscated, and zero-day prompt injection attempts with high semantic fidelity.
* **Warmup on Startup:** FastAPI's asynchronous `lifespan` handler pre-warms the tokenizer and model weights on server boot to eliminate cold-start latency for user queries.

### 2. Zero Raw PII Persistence (DPDP Act 2023 Compliance)
* Microsoft Presidio and spaCy (`en_core_web_lg`) deterministic entity recognition scans incoming prompts for names, phone numbers, email addresses, Aadhaar numbers, PAN cards, credit cards, IP addresses, and SSNs.
* Sensitive values are masked (e.g., `<PERSON>`, `<EMAIL_ADDRESS>`) **before** prompt storage and before LLM inference, ensuring complete data minimization under the DPDP Act 2023.

### 3. Multi-Provider Self-Healing LLM Rotation
When upstream providers encounter HTTP 429 rate limits, credit exhaustion, or temporary outages, Eclipse automatically fails over across 5 distinct providers without disrupting user conversations:
1. **Google Gemini** (`gemini-3.8-flash`)
2. **Groq** (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)
3. **Cerebras** (`llama-3.1-8b`, `llama-3.3-70b`)
4. **NVIDIA NIM** (`mistralai/mistral-nemo-12b-instruct`)
5. **Mistral AI** (`mistral-small-latest`)

Providers experiencing rate limits enter an automatic, self-resetting cooldown period.

### 4. Executive DPDP Compliance PDF Audit Reports
Built with ReportLab, generating executive light-themed PDF compliance dossiers with:
* Clean white canvas (`#FFFFFF`) with Deep Indigo and Slate accents.
* High-impact summary KPI metric cards.
* Classification tier distribution charts.
* Zebra-striped audit trail tables with color-coded threat badges.
* Two-pass dynamic `Page X of Y` canvas numbering and formal DPDP Act 2023 legal attestation.

---

## API Gateway Specification (`http://localhost:5000`)

### Authentication (`/auth` or `/api/auth`)
* `POST /auth/signup` — Register a new user account with bcrypt password hashing.
* `POST /auth/login` — Authenticate credentials; returns stateless JWT (`sub`, `user_id`, `is_admin`).
* `POST /auth/logout` — Client logout hook.
* `GET  /auth/me` — *(JWT Protected)* Retrieve currently authenticated profile and admin status.
* `POST /auth/change-password` — *(JWT Protected)* Verify existing password and set new bcrypt hash ($\ge 8$ chars).

### Conversations & Chat (`/`)
* `POST /chat` — Main guardrail chat entrypoint. Enriches context and routes to Python ML microservice via internal proxy.
* `GET  /conversations?user_id=:id` — Fetch conversation threads for a specific user.
* `GET  /conversations/:sessionId` — Fetch full message history for a conversation.
* `PATCH /conversations/:sessionId/title` — Rename conversation title.
* `DELETE /conversations/:sessionId` — Delete conversation thread and its associated message history.
* `GET  /dashboard-stats` — Public aggregate security telemetry stats.
* `GET  /logs` — Retrieve recent audit logs.

### Admin Operations (`/api/admin` or `/admin`) *(Admin JWT Protected)*
* `GET  /api/admin/users` — List all registered users with request counts, creation dates, and flag status.
* `GET  /api/admin/stats` — Detailed admin analytics: user counts, flag metrics, API usage breakdown.
* `GET  /api/admin/anomalies` — List security anomalies detected by the Python Isolation Forest engine.
* `PUT  /api/admin/user/:user_id/flag` — Toggle user security review flag (`is_flagged: true/false`).

---

## Internal Python ML Endpoints (`http://127.0.0.1:8001/internal/*`)
*Protected by `X-Internal-Secret: <INTERNAL_SERVICE_KEY>` header.*

* `POST /internal/process-chat` — Evaluates prompt through Presidio PII masking, Threat Classifier, DeBERTa Injection Detector, LLM Rotation, and Output Guardrail.
* `GET  /internal/anomalies` — Runs unsupervised scikit-learn Isolation Forest anomaly detector on audit log distributions.
* `GET  /internal/report/download?type=session&id=:sessionId` — Generates and streams single-session PDF audit report.
* `GET  /internal/report/download?type=weekly` — Generates and streams system-wide 7-day compliance PDF report.

---

## Environment Configuration

### 1. Backend Microservice (`backend/.env`)
```env
PORT=8001
MONGO_URI=mongodb://localhost:27017/llm_guardrail
INTERNAL_SERVICE_KEY=eclipse_internal_guardrail_secret_key_2026
JWT_SECRET=your_super_secret_jwt_key_eclipse_2026

# Injection Detector Mode: 'ml' (DeBERTa-v3 neural model) or 'rules' (regex heuristic fast-path)
INJECTION_DETECTOR_MODE=ml
INJECTION_MODEL_NAME=protectai/deberta-v3-base-prompt-injection-v2
INJECTION_CONFIDENCE_THRESHOLD=0.70

# LLM Provider API Keys (at least one required)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
NVIDIA_API_KEY=your_nvidia_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

### 2. Express Gateway (`server/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/llm_guardrail
JWT_SECRET=your_super_secret_jwt_key_eclipse_2026
PYTHON_SERVICE_URL=http://127.0.0.1:8001
INTERNAL_SERVICE_KEY=eclipse_internal_guardrail_secret_key_2026
CLIENT_URL=http://localhost:5173
ADMIN_CLIENT_URL=http://localhost:5174
```

### 3. User Frontend (`frontend/.env`)
```env
VITE_API_BASE=http://localhost:5000
```

### 4. Admin Frontend (`admin_frontend/.env`)
```env
VITE_NODE_API_URL=http://localhost:5000
VITE_PY_API_URL=http://127.0.0.1:8001
```

---

## Local Development & Startup Instructions

Run each service in a separate terminal window:

### Terminal 1: MongoDB Database
```bash
# Ensure local MongoDB daemon is running
mongod --dbpath /data/db
```

### Terminal 2: Python ML Microservice (Port 8001)
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_lg

uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### Terminal 3: Express API Gateway (Port 5000)
```bash
cd server
npm install
npm run dev
```

### Terminal 4: User Frontend Application (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

### Terminal 5: Admin Security Dashboard (Port 5174)
```bash
cd admin_frontend
npm install
npm run dev
```

---

## Verification & Health Check

* **Gateway Health:** Open `http://localhost:5000/health` (returns `{ status: "ok" }`).
* **Python Microservice Health:** Open `http://127.0.0.1:8001/health` (returns `{ status: "healthy", ... }`).
* **Interactive ML Docs:** Open `http://127.0.0.1:8001/docs`.
* **User Application:** Visit `http://localhost:5173` to test conversational guardrails, PII masking, and blocked prompt explanations.
* **Admin Application:** Visit `http://localhost:5174` to view live traffic analytics, review flagged accounts, inspect anomalies, and download DPDP Act 2023 compliance audit PDFs.
