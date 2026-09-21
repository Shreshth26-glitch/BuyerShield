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

Run the automated backend acceptance test suite (covers project search, duplicate prevention, case creation, derived fields, payment history, and cross-account 404 security):

```bash
node server/test/phase2_test.js
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
- [ ] **Phase 3: Real-Time State RERA Scraping & Sync** (Automated sync with MahaRERA & Karnataka RERA portals for QPR filings and OC tracking)
- [ ] **Phase 4: Statutory Remedy & Interest Ledger Calculator** (Rule-mandated SBI Highest MCLR + 200 bps compounding computation)
- [ ] **Phase 5: RAG Legal Precedents & Citation Engine** (Vector semantic search over Supreme Court and state RERA tribunal orders)
- [ ] **Phase 6: Section 31 Formal Complaint Generator** (Pre-formatted Form M / Form N legal draft export for tribunal filing)

---

## License
ISC License © 2026 BuyerShield. Built for home buyer empowerment under the Real Estate (Regulation and Development) Act, 2016.
