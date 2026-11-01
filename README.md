<!-- ============================================================
     HEADER
     ============================================================ -->

<div align="center">

# 🩺 MedVault

### One patient. One secure medical ID.

**A unified digital medical record platform — mobile-first, offline-ready, and built to make a patient's medical history portable, organized, and accessible when it matters most.**

[![Status](https://img.shields.io/badge/status-prototype-blueviolet?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](#license)
[![No dependencies](https://img.shields.io/badge/dependencies-zero-success?style=for-the-badge)](#technology-stack)
[![Mobile first](https://img.shields.io/badge/design-mobile--first-ff69b4?style=for-the-badge)](#)

<!-- Replace the line below with your live Pages URL once it's enabled -->
[**🚀 Try the live demo →**](https://atxlya.github.io/MedVault/)

</div>

---

<!-- ============================================================
     HERO / SCREENSHOT
     ============================================================ -->

<div align="center">

<!-- Drop a screenshot of the phone home screen here -->
<!-- ![MedVault Home](docs/screenshot-home.png) -->

*A polished mobile experience with an AI-powered health summary, unified Medical ID, and provider-connected record sharing.*

</div>

---

<!-- ============================================================
     TABLE OF CONTENTS
     ============================================================ -->

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Feature Highlights](#-feature-highlights)
- [Roles & Permissions](#-roles--permissions)
- [How It Works](#-how-it-works)
- [Demo Credentials](#-demo-credentials)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Code Architecture](#-code-architecture)
- [Data Model](#-data-model)
- [AI Health Summary](#-ai-health-summary)
- [Emergency Break-Glass Access](#-emergency-break-glass-access)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Security Notes](#-security-notes)
- [License](#-license)

---

<!-- ============================================================
     PROBLEM & SOLUTION
     ============================================================ -->

## 🩹 The Problem

Medical information today is **fragmented across hospitals, clinics, diagnostic centers, pharmacies, and physical folders**. Patients repeatedly explain the same history. Important reports get lost. Doctors lack immediate access to previous diagnoses, allergies, and medications. Elderly patients and people with limited digital literacy struggle to manage mobile apps. And in emergencies, an unconscious patient may be unable to provide any history at all.

## 💡 The Solution

**MedVault** provides a patient-centered digital health record with provider connectivity.

| | |
|---|---|
| 🪪 **Unified Medical ID** | One persistent identity that links records across every participating healthcare provider. |
| 🤖 **AI + OCR organization** | Unstructured prescriptions and reports become searchable, structured clinical data. |
| 🔐 **Consent-based sharing** | The patient decides who sees what, for how long, and for which purpose — with full auditability. |
| 🚨 **Emergency access** | A break-glass workflow surfaces clinically relevant information when the patient cannot communicate. |
| 👨‍👩‍👧 **Assisted access** | Hospitals can link records directly without the patient operating a smartphone. |
| 📊 **AI Health Summary** | Every glance at the dashboard gives an analysed, plain-English view of the patient's body and important results. |

---

<!-- ============================================================
     FEATURES
     ============================================================ -->

## ✨ Feature Highlights

<table>
<tr>
<td width="50%" valign="top">

### 🪪 Medical Identity
- Persistent **MedVault ID** + ABHA-linked record
- QR-based sharing for facility check-in
- Verified facility linking
- Patient-managed emergency profile

### 📚 Unified Records
- Chronological **medical timeline**
- Smart search across titles, facilities, doctors, and tags
- Filter by record type (prescription, lab, scan, discharge, vaccination, consultation)
- OCR-based document extraction with review workflow

</td>
<td width="50%" valign="top">

### 🔐 Consent & Privacy
- Grant / revoke / expire consents per provider
- Scope-limited by record type
- Provider-initiated consent requests
- Complete audit log of every view, change, and share

### 🚨 Emergency & Assisted Access
- Break-glass emergency workflow with justification
- Scoped emergency profile (blood group, allergies, conditions, medications, contact)
- Assisted record linking for elderly / digitally inexperienced patients
- Admin review queue for every exceptional access

</td>
</tr>
</table>

---

<!-- ============================================================
     ROLES
     ============================================================ -->

## 👥 Roles & Permissions

MedVault implements **five distinct roles**, each with its own navigation, screens, and capability set.

<table>
<tr>
<th>Role</th>
<th>Dashboard</th>
<th>Capabilities</th>
</tr>
<tr>
<td><b>🧑 Patient</b></td>
<td>5-tab mobile shell</td>
<td>Manage records, consents, caregivers, emergency profile, view AI health summary, access full audit log.</td>
</tr>
<tr>
<td><b>👩‍👦 Caregiver</b></td>
<td>Patient shell + patient switcher</td>
<td>Everything a patient can do, on behalf of one or more linked patients. Every action is logged with the caregiver's name.</td>
</tr>
<tr>
<td><b>⚕️ Provider</b></td>
<td>Provider portal</td>
<td>Look up patients, request consent, view only what's been consented, run the assisted record-linking wizard, upload records.</td>
</tr>
<tr>
<td><b>🛡️ Admin</b></td>
<td>Platform overview</td>
<td>Manage users and facilities, review break-glass events, inspect the full platform audit trail.</td>
</tr>
<tr>
<td><b>🚑 Emergency</b></td>
<td>Break-glass session (no login)</td>
<td>Access a scoped emergency profile for an unconscious patient. Always logged, time-limited, and reviewed.</td>
</tr>
</table>

---

<!-- ============================================================
     HOW IT WORKS
     ============================================================ -->

## ⚙️ How It Works

The core record flow MedVault implements:

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌───────────┐
│  Patient │ →  │ Identity │ →  │  Medical ID  │ →  │ Provider │ →  │ MedVault  │
└──────────┘    └──────────┘    └──────────────┘    └──────────┘    └───────────┘
```

1. **Identity verification** establishes *who the patient is* (Aadhaar auth, ABHA number, or existing Medical ID).
2. The verified identity resolves to the patient's **MedVault / ABHA-linked record**.
3. A **participating provider** uploads consultation notes, prescriptions, reports, scans, or discharge summaries — either from the provider portal or via the assisted-linking wizard.
4. MedVault runs **OCR + classification** and places the document on the patient's timeline.
5. The patient or their caregiver is **notified**; every action lands in the **audit trail**.

**Consent decides access.** No provider sees a record unless the patient (or an authorized caregiver) grants scoped, expiring consent — except for audited emergency break-glass access.

---

<!-- ============================================================
     DEMO CREDENTIALS
     ============================================================ -->

## 🔑 Demo Credentials

All accounts use password **`demo123`**.

| Role | Email | Description |
|:---|:---|:---|
| 🧑 **Patient** | `patient@medvault.demo` | Atulya Verma · MV-1001 |
| 👩‍👦 **Caregiver** | `caregiver@medvault.demo` | Sunita Verma · manages 2 patients |
| ⚕️ **Provider** | `doctor@medvault.demo` | Dr. Ananya Rao · Apollo Hospitals |
| 🛡️ **Admin** | `admin@medvault.demo` | Kavita Menon · Platform administrator |

> **Emergency break-glass** is also available directly from the login screen — no account required.

The seed database ships with:
- 3 patients
- 4 providers across 5 facilities
- 10 medical records spanning 2023–2025
- 5 consents (active, revoked, provider-initiated)
- 3 break-glass events (pending, reviewed, flagged)
- A full audit trail of 12 events

---

<!-- ============================================================
     TECHNOLOGY STACK
     ============================================================ -->

## 🛠️ Technology Stack

MedVault is deliberately built on the web platform itself — no frameworks, no build step, no dependencies.

<table>
<tr>
<td valign="top" width="33%">

**Frontend**
- Vanilla HTML5
- Vanilla CSS3 (custom design system)
- Vanilla JavaScript (ES2020)
- Single-page application
- Mobile-first responsive layout

</td>
<td valign="top" width="33%">

**Persistence**
- `localStorage` for the seeded database
- `sessionStorage` for the auth session
- Reset-from-UI to restore the seed

</td>
<td valign="top" width="33%">

**Design System**
- Inter font (Google Fonts)
- Custom CSS variables
- Inline SVG icon set
- Bottom-sheet & fullscreen primitives
- Safe-area-inset aware

</td>
</tr>
</table>

**Why no framework?** So the entire prototype is a single `git clone` away from running on any machine with a browser — no `npm install`, no compilation, no toolchain drift. Every behaviour you see is inspectable in the source.

---

<!-- ============================================================
     PROJECT STRUCTURE
     ============================================================ -->

## 📁 Project Structure

```
medvault/
├── index.html                     ← Page shell + script loader
├── README.md
├── LICENSE
├── .gitignore
│
├── css/
│   └── styles.css                 ← Design system + all component styles
│
└── js/
    ├── core.js                    ← Utilities, date/format helpers, SVG icon set
    ├── data.js                    ← Record types + seed database
    ├── store.js                   ← Persistence, session, audit + notify helpers
    ├── ui.js                      ← Toast, Sheet, Fullscreen, simulated OCR
    ├── app.js                     ← App controller + role/tab registry
    ├── ai.js                      ← AI Health Summary engine
    │
    ├── screens-auth.js            ← Login, auth bindings, break-glass entry
    ├── screens-patient.js         ← Patient + caregiver screens & modals
    ├── screens-provider.js        ← Provider screens, wizard, consent flows
    ├── screens-admin.js           ← Admin dashboard, users, break-glass review
    ├── screens-emergency.js       ← Break-glass responder session
    │
    └── main.js                    ← Boot + frame toggle
```

Every file has a **single, well-defined responsibility**. The load order in `index.html` reflects the dependency graph — nothing is hoisted, nothing is implicit.

---

<!-- ============================================================
     ARCHITECTURE
     ============================================================ -->

## 🏗️ Code Architecture

MedVault follows a **layered, event-driven** architecture that runs entirely in the browser.

```
┌──────────────────────────────────────────────────────────────┐
│  main.js             — DOMContentLoaded → App.start()        │
├──────────────────────────────────────────────────────────────┤
│  app.js              — App controller                        │
│                        • navigation (tabs + sub-screens)     │
│                        • header, notifications, menu          │
│                        • role & patient resolution            │
│                        • render orchestration                 │
├──────────────────────────────────────────────────────────────┤
│  screens-*.js        — One file per role                     │
│                        • each registers Screens[role][id]    │
│                        • each registers Screens[role].bind   │
├──────────────────────────────────────────────────────────────┤
│  ai.js               — AI Health Summary                     │
│                        • extracts metrics from labs/vitals   │
│                        • evaluates body systems              │
│                        • produces recommendations            │
├──────────────────────────────────────────────────────────────┤
│  store.js            — Persistence + audit + session         │
│  ui.js               — Toast / Sheet / Fullscreen / OCR      │
├──────────────────────────────────────────────────────────────┤
│  data.js             — Seed data (the "database")            │
│  core.js             — Utilities + icon library              │
└──────────────────────────────────────────────────────────────┘
```

### The rendering loop

MedVault never mutates the DOM directly from a screen. The pattern is:

```
1. App.go(tab)              — change the active view
2. App.render()             — rebuild the shell
3. App.renderHeader()       — top bar with role-aware actions
4. App.renderBody()         — call the current screen function
5. Screens[role][tab]()     — return an HTML string
6. Screens[role].bind[tab]  — attach event listeners
```

Every user action that changes data ends with `App.renderBody()` — a clean, predictable re-render of just the current screen. No diffing, no virtual DOM, no state bugs.

### Screens registry

```js
const Screens = {
  auth:      { login },
  patient:   { home, timeline, records, share, profile, consents, caregivers, emergency, audit, 'medical-id', patients },
  caregiver: { /* mirrors patient + patients tab */ },
  provider:  { home, lookup, assisted, patients, profile, consent, record, audit },
  admin:     { home, users, breakglass, audit, profile, facilities },
  emergency: { emergency, timeline, profile }
};
```

Adding a new screen is a two-line change: a function that returns HTML, plus a binding function. The registry does the rest.

---

<!-- ============================================================
     DATA MODEL
     ============================================================ -->

## 🗃️ Data Model

The prototype ships with a **fully relational in-memory database**, seeded into `localStorage`.

```
┌────────────┐       ┌────────────┐       ┌────────────┐
│   Users    │───┬──►│  Patients  │◄──────│ Caregiver  │
└────────────┘   │   └────────────┘       │   Links    │
                 │        │               └────────────┘
                 │        │
                 │        ▼
                 │   ┌────────────┐       ┌────────────┐
                 │   │  Records   │◄──────│ Facilities │
                 │   └────────────┘       └────────────┘
                 │        │
                 ▼        ▼
            ┌────────────────┐           ┌────────────┐
            │   Consents     │           │  Providers │
            └────────────────┘           └────────────┘
                 │
                 ▼
            ┌────────────────┐
            │    Audit       │
            └────────────────┘
                 ▲
                 │
            ┌────────────────┐
            │  Break-Glass   │
            └────────────────┘
```

### Entity reference

| Entity | Purpose | Key fields |
|---|---|---|
| **Patients** | The record subject | `medvaultId`, `abhaId`, `bloodGroup`, `allergies`, `conditions`, `medications`, `emergencyContact` |
| **Providers** | Prescribers & consultants | `specialty`, `facilityId`, `regNo` |
| **Facilities** | Hospitals, clinics, labs | `verified` flag controls linking permissions |
| **Records** | The documents themselves | `type`, `date`, `facilityName`, `extracted` (structured OCR output) |
| **Consents** | Scoped access grants | `recordTypes[]`, `purpose`, `expiresAt`, `status` |
| **Audit** | Every sensitive event | `actor`, `action`, `severity` |
| **Break-glass** | Emergency access events | `reason`, `scopesAccessed[]`, `status`, `reviewNote` |
| **Caregiver links** | Delegated access | `permissions[]`, `relation` |

All entities are stored under a single versioned key: `medvault.mobile.db.v1`. Bumping the version number triggers a clean re-seed.

---

<!-- ============================================================
     AI HEALTH SUMMARY
     ============================================================ -->

## 🤖 AI Health Summary

The dashboard's flagship feature — an analysed, patient-friendly view of the whole record.

### What it does

1. **Extracts metrics** from every lab report and vitals block, using pattern matching:
   ```
   HbA1c 7.1%         →  hba1c = 7.1
   FBS 128 mg/dL      →  fbs = 128
   LDL 108 mg/dL      →  ldl = 108
   Creatinine 1.0     →  creatinine = 1.0
   eGFR 72 mL/min     →  egfr = 72
   BP 124/80 mmHg     →  bp = "124/80"
   ```

2. **Computes trends** by comparing the two most recent lab reports for each metric.

3. **Evaluates body systems** — Cardiovascular, Metabolic, Renal, Musculoskeletal, Respiratory — each scored `good` / `watch` / `alert` using the extracted data plus the patient's conditions and medications.

4. **Produces a status** — *Overall stable*, *Needs attention*, or *Action advised* — based on the worst-case across all systems and metrics.

5. **Surfaces "what matters"** — plain-English callouts for each abnormal result.

6. **Recommends next steps** — a short, tailored list derived from the data.

### States

The card has three states, all handled cleanly:

| State | Trigger |
|---|---|
| **Loading** | Shimmer + spinner while the analysis runs (~1.5 s, simulated) |
| **Populated** | Full report with metrics, systems, callouts, recommendations |
| **Refresh** | Tap the refresh button → back to loading → fresh report |

The summary is **invalidated on every navigation away from home** and on **logout** — so a demo never shows stale data.

---

<!-- ============================================================
     EMERGENCY
     ============================================================ -->

## 🚨 Emergency Break-Glass Access

Emergency access is a first-class workflow, not an afterthought.

### The flow

```
Login screen → Break-glass form
                        │
                        ├─ Responder name & role
                        ├─ Facility
                        ├─ Patient MedVault ID
                        └─ Clinical justification (10+ chars)
                        │
                        ▼
              Scoped emergency session
                        │
                        ├─ Blood group (large, prominent)
                        ├─ Allergies (highlighted red)
                        ├─ Chronic conditions
                        ├─ Current medications
                        ├─ Emergency contact (tap to call)
                        └─ Recent clinically relevant records
                        │
                        ▼
        ⚠️ Critical audit event + patient notification
                        │
                        ▼
        Admin review queue (Pending → Reviewed / Flagged)
```

**Rules the prototype enforces:**
- Scope is **fixed** to clinically relevant information — full history is never exposed.
- Every event creates a **critical-severity audit entry**.
- The patient and linked caregivers are **notified** immediately.
- Admins must write a **review note** before closing an event.
- Nothing can be silently dismissed.

---

<!-- ============================================================
     RUN LOCALLY
     ============================================================ -->

## 🚀 Running Locally

### Option 1 — Serve the folder (recommended)

```bash
# Python 3 (built into macOS / Linux)
python3 -m http.server 5173

# Or with Node.js
npx serve -l 5173

# Or with PHP
php -S localhost:5173
```

Then open **http://localhost:5173**.

### Option 2 — Open the file directly

Double-click `index.html`. Everything works except that **`localStorage` may behave inconsistently on `file://`** in some browsers. Use Option 1 if you notice data not persisting.

### Option 3 — VS Code Live Server

Install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.

### No build step. No dependencies. No installation.

---

<!-- ============================================================
     DEPLOYMENT
     ============================================================ -->

## 🌐 Deployment

MedVault is a **static site** — it deploys anywhere that can serve files.

### GitHub Pages (free, recommended)

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Set **Branch** to `main` and **Folder** to `/ (root)`.
5. Save. Your site goes live at `https://<username>.github.io/<repo>/` in ~45 seconds.

### Other one-click options

| Platform | Command / Action |
|---|---|
| **Netlify** | Drag the folder onto netlify.com/drop |
| **Vercel** | `vercel --prod` in the project root |
| **Cloudflare Pages** | Connect the repo, leave build command empty |
| **Surge** | `npx surge` from the project root |

Because there's no build step, every platform works with **zero configuration**.

---

<!-- ============================================================
     ROADMAP
     ============================================================ -->

## 🗺️ Roadmap

The prototype demonstrates the full product vision. Turning it into a production system would mean:

### Phase 1 — Real backend
- [ ] Node.js / Fastify API with PostgreSQL
- [ ] End-to-end encrypted document storage (S3 + KMS)
- [ ] Real authentication (OAuth 2.0 / OIDC) with MFA
- [ ] Bcrypt / Argon2 password hashing

### Phase 2 — Real integrations
- [ ] ABDM / ABHA sandbox integration
- [ ] Aadhaar offline XML verification (no biometrics)
- [ ] HL7 FHIR resources for interoperability
- [ ] Real OCR via Tesseract, Google Vision, or AWS Textract
- [ ] Push notifications (FCM / APNs)

### Phase 3 — Mobile apps
- [ ] React Native / Expo build
- [ ] Offline-first sync engine
- [ ] Native biometric unlock (Face ID / fingerprint)
- [ ] Progressive Web App installation

### Phase 4 — Clinical intelligence
- [ ] Trend forecasting on lab results
- [ ] Drug interaction warnings
- [ ] Multi-language summaries
- [ ] Voice-first interface for elderly users
- [ ] Clinician-facing AI summaries with human oversight

---

<!-- ============================================================
     SECURITY
     ============================================================ -->

## 🔒 Security Notes

**This is a prototype.** The following production requirements are deliberately *not* implemented, and are documented here so nothing is hidden:

| Area | Prototype | Production requirement |
|---|---|---|
| **Passwords** | Plain text in `localStorage` | Argon2id hashing, server-side only |
| **Session** | `sessionStorage` flag | Signed JWTs with rotation, or server sessions |
| **Data at rest** | Unencrypted `localStorage` | AES-256 envelope encryption |
| **Data in transit** | HTTPS on Pages | HTTPS + mTLS for provider APIs |
| **Authentication** | Username / password only | OIDC + MFA + passkeys |
| **Authorisation** | Client-side checks | Server-enforced RBAC + row-level security |
| **Audit integrity** | Mutable array | Append-only log with cryptographic chaining |
| **Aadhaar** | Never touched | Only the offline XML verification path, per UIDAI rules |
| **Consent** | Local state | Digitally signed consent artifacts |

**What the prototype *does* demonstrate correctly:**
- Role-based access on every route and every action
- Scoped consent that providers cannot bypass
- An auditable trail of every view, change, and share
- Emergency access that is scoped, justified, and reviewed
- No Aadhaar biometric data is ever stored, referenced, or retrieved

---

<!-- ============================================================
     LICENSE
     ============================================================ -->

## 📄 License

Released under the **MIT License**. See [LICENSE](LICENSE) for the full text.

You may use, modify, and distribute this code freely, including in commercial projects.

---

<!-- ============================================================
     FOOTER
     ============================================================ -->

<div align="center">

### ⭐ If this project was useful, consider giving it a star.

Built as a demonstration of a **provider-connected, patient-controlled** digital health record.

**One patient. One secure medical ID.**

</div>