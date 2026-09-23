# BuyerShield

> **Verified RERA Section 18 Statutory Advisory, Delay Auditing & Case Management for Indian Home Buyers**

BuyerShield is an evidentiary civic-tech and legal research platform designed to help Indian apartment buyers protect their statutory entitlements under Section 18 of the **Real Estate (Regulation and Development) Act, 2016 (RERA)**. 

When developers delay project possession, Section 18 grants allottees the unconditional right to either **claim monthly interest (mandated at SBI Highest MCLR + 2%)** until handover with a valid Occupancy Certificate (OC), or demand a **100% refund with interest and legal compensation**. BuyerShield bridges the information asymmetry between home buyers and promoters by cross-referencing contractual agreements against official state regulatory filings, maintaining payment ledgers, and organizing formal tribunal dossiers.

---

## Current Status & Completed Milestones

### Phase 1 — Architecture, Database & Civic Design System
- **Database Schema**: Fully normalized PostgreSQL schema with automated timestamp triggers and indexing:
  - `users`: Secure authentication with bcrypt password hashing and role permissions.
  - `projects`: Master project directory tracking state jurisdictions, RERA registration numbers, promoter entities, and completion targets.
  - `buyer_cases`: Encapsulates buyer agreements, promised possession dates, and elected remedies.
  - `case_payments`: Detailed installment disbursement history.
  - `precedent_orders`, `complaint_drafts`, and `sync_jobs`: Schema foundations for upcoming phases.
- **Authentication**: JWT token-based authentication with session validation, protected routes, and user context.
- **Civic Legal Design System**: Built with an editorial, institutional legal-research aesthetic:
  - Typography: *Playfair Display* (Editorial Serif), *Plus Jakarta Sans* (Clean Body), and *JetBrains Mono* (Statutory Data).
  - Color Palette: Deep Forest Green (`#1F3D2B`), Legal Parchment (`#F7F2E9`), Ivory Card (`#FFFDF6`), Hairline Borders (`#E3D9C6`), and Rust Warning (`#A34A28`).
  - Geometric, sharp edges (`rounded-none`), hairline dividers, and zero drop shadows.
- **Core Components**: `<Section>`, `<EyebrowLabel>`, `<NumberedColumn>`, `<Badge>`, `<StatBlock>`, `<Navbar>`, `<Footer>`.

### Phase 1B — Motion & Premium Feel Layer
- **Coordinated Page-Load Timeline**: Single coordinated GSAP timeline animating the navbar, drawing eyebrow dashes ($0 \to 22\text{px}$), splitting headlines into staggered line reveals, and settling supporting metrics without layout flashes.
- **Scroll-Triggered Reveals**: GSAP `ScrollTrigger` batch-revealing workflow and dashboard milestone cards with natural stagger (`once: true`).
- **Scrubbed Eyebrow Accent Dash**: Synchronized section scroll progress directly to dash length (`scrub: true`).
- **Smooth Scrolling**: Global integration of `Lenis` tuned to an unhurried, natural feel and synchronized with GSAP's ticker.
- **Page Transitions**: Route changes wrapped in fluid 280ms GSAP fade and micro-shift transitions.
- **Three.js Scoped Wireframe Hero**: Code-split, low-poly wireframe grid plane with subtle autonomous drift, mouse parallax tilt, and scroll pitch tilt. Fully unmounted and disposed on navigation; automatically skipped on mobile viewports (< 768px).
- **Accessibility**: Full respect for `prefers-reduced-motion: reduce` (instant layout, animations skipped, Three.js unmounted).

### Phase 2 — Core Data & Manual Case Management
- **Search-First Project Lookup**: Public endpoint (`GET /api/projects?search=`) allowing buyers to search by RERA ID, project name, or developer before manual entry.
- **Duplicate Prevention**: Rejects duplicate project entries with matching `rera_number` and `state`, returning the existing record seamlessly.
- **Case Dossier Management**:
  - Creates buyer cases linking agreements to projects.
  - Dynamically calculates derived server-side fields:
    - `days_delayed`: Contractual deadline vs. today ($\max(0, \text{today} - \text{deadline})$).
    - `total_paid`: Exact real-time sum of audited payment installments ($ \sum \text{amount} $).
- **Payment Ledger**:
  - Chronological installment tracking (`POST`, `GET`, `DELETE /api/cases/:id/payments`).
  - Inline installment logging with validation for positive numbers and receipt dates.
- **Strict User Isolation (Security)**:
  - All foreign case access attempts return **HTTP 404 (Not Found)** rather than 403, preventing case enumeration across accounts.
- **Frontend Pages**:
  - `AddCaseModal.jsx`: Multi-step search-first lookup with self-reported unverified fallback form.
  - `CaseDetailPage.jsx`: Dedicated case dossier with 3-stat metric row, contractual timeline, and payment ledger.
  - `DashboardPage.jsx`: Dynamic directory listing active property cases with staggered scroll reveal, retaining the Phase 1 empty state when 0 cases exist.
- **Automated Verification**: Comprehensive test suite (`server/test/phase2_test.js`) verifying all validation rules, derived metrics, and security isolation.

### Phase 3 — RERA Portal Ingestion Pipeline & Reconciliation
- **Per-State Adapter Architecture**:
  - Extensible `StateAdapter` base class with code-level polite throttling (`throttle()`), browser mimicry headers, and custom exception hierarchy (`TransientSyncError`, `StructuralSyncError`, `ProjectNotFoundError`).
  - Concrete `MahaRERAAdapter` (Maharashtra) and `KarnatakaRERAAdapter` (Karnataka) parsing public portal disclosures.
- **Orchestration & Resilient Retry Engine (`SyncService`)**:
  - Exponential backoff retry policy: up to 2 retries with progressive delay for transient portal timeouts/5xx errors; immediate failure without retrying on structural DOM shifts or 404s.
  - Scheduled daily background synchronization (`SyncService.initScheduler()`) automatically checking active cases.
  - Comprehensive job audit trails logged to `sync_jobs` table (`project_id`, `state`, `status`, `retry_count`, `error_log`, `completed_at`).
- **Section 18 Contractual Reconciliation Engine**:
  - **Preserves Buyer Baseline**: Under no circumstance is the buyer's contractual `promised_date_from_agreement` overwritten by developer filings on the portal.
  - **Mismatch Detection**: Detects unilateral portal deadline extensions and flags `reconciliation_status = 'mismatched'`.
  - Captures `previous_registered_possession_date` and official `complaint_count` from portal disclosures.
- **On-Demand Buyer Portal Synchronization**:
  - On-demand `POST /api/cases/:id/sync` endpoint with per-user 1-hour cooldown protection (returns HTTP 429 with remaining cooldown).
  - Graceful degradation: Sync outages never corrupt saved buyer data or block access to case dossiers.
- **Admin Ingestion Telemetry & Monitoring Console (`/admin/sync`)**:
  - 7-day and 30-day aggregate success rates per state portal.
  - Filterable audit table with job statuses (`success`, `failed`, `running`), execution timestamps, and expandable diagnostic error trace logs.
  - Single-click manual retry endpoint (`POST /api/admin/sync/retry/:jobId`) with admin RBAC protection.
- **Frontend Dossier Enhancements**:
  - "Verified [date] via [State] RERA" vs. "Unverified — self-reported data" badge.
  - Prominent Section 18 statutory discrepancy warning box explaining that the agreement date legally supersedes unilateral portal extensions.
  - Dynamic on-demand sync button with inline status alerts.

### Phase 4 — Statutory Remedy & Interest Ledger Calculator
- **Pure Deterministic Calculation Engine (`remedyMath.js`)**:
  - Zero AI / LLM involvement: 100% deterministic pure mathematical functions.
  - **Integer-Paise Precision**: Internal calculations performed in integer paise to eliminate floating-point drift.
  - **Section 18(1) Remedy A (Withdraw)**: Full refund of capital paid plus simple interest accrued from the delay start date to today at the state statutory rate.
  - **Section 18(1) Remedy B (Continue & Claim Interest)**: Month-by-month accrued delay interest schedule, itemizing each calendar billing cycle's elapsed days and accrued interest. Guaranteed zero rounding drift between the sum of itemized rows and the displayed total.
- **Dynamic State Interest Rate Policies**:
  - Configurable `interest_rate_policies` schema storing base benchmark rates (e.g. SBI Highest MCLR at 9.10%), statutory spread (+2.00%), effective dates, and authority circular URLs (MahaRERA Rule 18, K-RERA Rule 16).
  - Pure typed error handling: Throws typed `PolicyNotFoundError` if an unconfigured state or date is requested rather than guessing or defaulting to 0%.
- **Evidentiary Calculation Audit Log (`remedy_calculations`)**:
  - Every calculation run persists an immutable timestamped record with applied rate, principal base, delay dates, and full itemized JSON breakdown. Recalculation appends to history without overwriting prior runs.
- **Guardrails & Security**:
  - Strictly blocks calculation if the contractual handover date has not yet passed (`today <= promised_date`), returning typed HTTP 400 `NOT_YET_DELAYED`.
  - User isolation: All foreign case calculation attempts return HTTP 404.
- **Frontend Dossier Assessment & Options UI**:
  - **Side-by-Side Comparative Options**: Option 01 (Withdraw) vs. Option 02 (Continue & Claim Interest) rendered side-by-side using `<NumberedColumn>` and `<StatBlock>`.
  - **Itemized Monthly Breakdown Table**: Hairline-divided schedule displaying each billing cycle, period days, and exact rupee accrual.
  - **Permanent Civic Disclaimer Banner**: Reusable, non-dismissible `<RemedyDisclaimer>` band anchored directly above the options.
  - **Neutrality Advisory**: Explicit statutory neutrality label: *"These are your two statutory options under Section 18 of the Act, not a legal recommendation of which to choose."*
  - **Audit Trail Modal**: Slide-over ledger showing chronological past calculation runs with timestamps and applied parameters.
- **Admin Rate Policy Management (`/admin/interest-rates`)**:
  - Dedicated CRUD console for state benchmark policies with source circular links and human-curation advisories.

### Phase 5 — RAG-Grounded Legal Explanation & Precedent Layer
- **Statutory Legal Unit Ingestion**:
  - Ingested core provisions of the RERA Act 2016 (`Section 18(1)`, `Section 18(1) Proviso`, `Section 18(2)`, `Section 18(3)`, `Section 2(za)`, `Section 19(4)`, `Section 31`) and state statutory rules (`MahaRERA Rule 18`, `Karnataka RERA Rule 16`).
  - Unit-based chunking preserves coherent legal reasoning without arbitrary token splits.
- **768-Dimensional Embedding & Retrieval Pipeline**:
  - Reused 768-dim sentence embedding architecture across provisions, precedent orders, and runtime buyer queries.
  - Multi-tier vector search compatible with PostgreSQL `pgvector` or in-memory cosine dot-product fallback.
- **Structured-Fact Reranking Engine (`RetrievalService.rerankCandidates`)**:
  - Balances semantic similarity (40%) with structured legal facts (60%): delay duration proximity (25%), payment disbursement percentage (15%), state jurisdiction match (10%), and remedy match (10%).
  - Demonstrably modifies candidate ranking from pure semantic similarity in 100% of benchmark test cases.
- **Strict Citation-Grounded Guardrails & Anti-Hallucination**:
  - Strictly requires every factual statement in the generated explanation to cite a valid, retrieved Act provision or precedent ID (`[PROV:...]`, `[PREC:...]`).
  - **Zero Guarantee Discipline**: Prohibits any guaranteed compensation statements for the buyer's own case, ensuring numbers remain strictly computed by Phase 4's deterministic calculator while precedents illustrate past tribunal decisions.
  - **Honest Low-Confidence Notice**: Flags `confidence_flag = 'low_confidence'` and returns an explicit limited-precedent notice whenever fewer than 2 closely comparable orders pass relevance thresholds.
- **Evaluation Benchmark Suite (`test/evaluate_retrieval.js`)**:
  - Committed 15-scenario labeled dataset (`test/fixtures/phase5_evaluation_dataset.json`).
  - Measures Precision@1 (100%), Precision@3 (59.5%), Recall@3 (96.4%), and Mean Reciprocal Rank (MRR = 1.000).
- **Human-in-the-Loop Admin Precedent Management (`/admin/precedents`)**:
  - AI extraction proposes structured fields from raw tribunal order text; human administrators review, edit, and confirm before saving and embedding into the vector space.
  - Precedent directory with filters for state, remedy type, search text, and unembedded orders.
- **Frontend Dossier Integration (`CaseDetailPage.jsx`)**:
  - Dedicated "Legal Basis & Regulatory Precedents" section with tabbed switches for Option 01 (Withdraw) and Option 02 (Continue).
  - Quoted Act provisions with mono badges, synthesized legal explanation with source tags, and structured precedent cards with `<StatBlock>` metrics for delay duration and payment percentage.
  - Full audit trail modal displaying historical explanation requests.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite, React Router v7 |
| **Styling & Design System** | TailwindCSS, CSS Variables, Custom Editorial Civic Tokens |
| **Motion & Graphics** | GSAP 3 (Core + ScrollTrigger), Lenis, Three.js (Code-split) |
| **Icons & Typography** | Lucide React, Google Fonts (*Playfair Display*, *Plus Jakarta Sans*, *JetBrains Mono*) |
| **Backend Runtime** | Node.js (ES Modules), Express.js |
| **Database** | PostgreSQL 18 with `pg` connection pooling |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, CORS |

---

## Project Structure

```
BuyerShield/
├── client/                     # Frontend Vite + React application
│   ├── src/
│   │   ├── components/         # Reusable design tokens (Section, StatBlock, Badge, etc.)
│   │   │   ├── AddCaseModal.jsx        # Search-first project lookup & case setup
│   │   │   ├── HeroBackground3D.jsx    # Lazy-loaded Three.js wireframe hero
│   │   │   ├── PageTransition.jsx      # GSAP route transition wrapper
│   │   │   ├── SmoothScroll.jsx        # Lenis smooth scroll provider
│   │   │   └── ...
│   │   ├── context/            # Authentication & API context (AuthContext)
│   │   ├── pages/              # Routed views
│   │   │   ├── CaseDetailPage.jsx      # Full statutory case dossier & ledger
│   │   │   ├── DashboardPage.jsx       # Active case directory & empty state
│   │   │   ├── LandingPage.jsx         # Hero timeline, Section 18 SOP, highlights
│   │   │   ├── LoginPage.jsx           # Secure case access authentication
│   │   │   └── RegisterPage.jsx        # New buyer account registration
│   │   ├── utils/              # Motion utilities & reduced-motion checks
│   │   ├── App.jsx             # Route definitions & transition shell
│   │   └── index.css           # Design tokens, typography & animation utilities
│   └── package.json
│
├── server/                     # Backend Express REST API
│   ├── src/
│   │   ├── config/             # Environment & configuration loader
│   │   ├── controllers/        # Route controllers (Project, Case, Auth)
│   │   ├── db/                 # Database pool & migration scripts
│   │   │   └── migrations/     # SQL schema definitions
│   │   ├── middleware/         # JWT authentication & centralized error handler
│   │   ├── models/             # Database access models (Case, Project, Payment, User)
│   │   ├── routes/             # Express API routes
│   │   └── server.js           # Server entry point
│   ├── test/                   # Automated API & security test suites
│   │   └── phase2_test.js      # Phase 2 test suite (10/10 passing assertions)
│   └── package.json
│
├── .env.example                # Root environment template
├── .gitignore                  # Git ignore rules (protects credentials and builds)
├── package.json                # Root workspace scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: v14.0 or higher running locally or remotely

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Shreshth26-glitch/BuyerShield.git
cd BuyerShield

# Install root, backend, and client dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` in both root and `server/`:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your PostgreSQL credentials:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=buyershield
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Security
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

### 3. Run Database Migrations
Create the `buyershield` database in PostgreSQL, then apply schema migrations:

```bash
npm run migrate
```

*(To roll back if needed: `npm run migrate:down`)*

### 4. Run Development Servers
Start backend and frontend servers in separate terminals:

```bash
# Terminal 1 — Backend API (runs on http://localhost:5000)
npm run dev:server

# Terminal 2 — Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Automated Tests

Run the automated backend acceptance test suites:

```bash
# Phase 2: CRUD, validation rules, derived metrics, and user isolation
node server/test/phase2_test.js

# Phase 3: Adapters, reconciliation engine, retry policies, rate limiting, and admin telemetry
node server/test/phase3_test.js

# Phase 4: Deterministic pure math, zero-drift breakdown, guardrails, audit logging, and admin rates CRUD
node server/test/phase4_test.js
```

Verify frontend linting and production build:
```bash
npm --prefix client run lint
npm --prefix client run build
```

---

## Roadmap

- [x] **Phase 1: Foundation & Design System** (DB schema, auth, editorial civic aesthetic, landing page)
- [x] **Phase 1B: Motion & Premium Feel Layer** (GSAP hero timeline, ScrollTrigger reveals, Lenis smooth scroll, Three.js hero wireframe)
- [x] **Phase 2: Core Data & Manual Case Management** (Project search & duplicate prevention, case dossiers, payment ledger, derived days delayed)
- [x] **Phase 3: RERA Portal Ingestion Pipeline & Reconciliation** (MahaRERA & K-RERA adapters, resilient sync retry, reconciliation mismatch detection, admin telemetry)
- [x] **Phase 4: Statutory Remedy & Interest Ledger Calculator** (Deterministic integer-paise math, month-by-month zero drift, audit trail, disclaimer banner, admin rate policies)
- [ ] **Phase 5: RAG Legal Precedents & Citation Engine** (Vector semantic search over Supreme Court and state RERA tribunal orders)
- [ ] **Phase 6: Section 31 Formal Complaint Generator** (Pre-formatted Form M / Form N legal draft export for tribunal filing)

---

## License
ISC License © 2026 BuyerShield. Built for home buyer empowerment under the Real Estate (Regulation and Development) Act, 2016.
