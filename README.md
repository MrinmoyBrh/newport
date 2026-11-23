# Mrinmoy Borah — Portfolio V2 (Espresso, Oat & Sage Green)

[![Astro](https://img.shields.io/badge/Astro-v5-9CAF88.svg)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-9CAF88.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-2B1D16.svg)](https://tailwindcss.com/)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-9CAF88.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License](https://img.shields.io/badge/License-MIT-E9DFCF.svg)](LICENSE)

A complete visual transformation (**Portfolio V2**) engineered for **Mrinmoy Borah** (Backend Software Engineer, B.Tech CSE at Dhemaji Engineering College, graduating 2027). Built with Astro, TypeScript, and Tailwind CSS.

Portfolio V2 is an **independent side project** redesigning the presentation into a warm, modern, minimal editorial aesthetic inspired by an Espresso, Oat, and Sage Green palette, while preserving all backend engineering depth, verified projects, interactive simulations, and CMS capabilities.

---

## 🎨 Visual Identity & Color System

The visual design is grounded in an editorial aesthetic with warm dark surfaces, soft rounded corners, floating pill containers, and high contrast ratios strictly complying with **WCAG 2.2 AA**:

| Color Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Deep Espresso** | `#1D1511` | Canvas base & deep background |
| **Espresso** | `#2B1D16` | Cards, navbar, panels, consoles |
| **Warm Brown** | `#403027` | Supporting translucent layers & secondary containers |
| **Oat** | `#E9DFCF` | Primary typography & editorial display headlines |
| **Muted Oat** | `#C9BFAF` | Secondary metadata, labels, technical specs, borders |
| **Sage Green** | `#9CAF88` | Primary calls to action, badges, status indicators |
| **Sage Hover** | `#B1C2A0` | Interactive hover & focus highlights |

---

## 🛰️ Architecture & Verified Projects

Every project and technical claim in this portfolio has been verified directly against actual source code and research engagements.

### 1. Adaptive AI Gateway & Resilient Workflow Engine
- **Repository:** [https://github.com/MrinmoyBrh/ai-resilient-gateway](https://github.com/MrinmoyBrh/ai-resilient-gateway)
- **Runtime & Stack:** Fastify v5, TypeScript, BullMQ, Redis (`ioredis`), PostgreSQL, Zod, Server-Sent Events (SSE).
- **Verified Code Mechanisms:**
  - **Deterministic SHA-256 Prompt Caching:** Normalized whitespace/case hashed with crypto SHA-256 (`cache:prompt:<hash>`) in Redis (3600s TTL), resolving cached inference in under 5ms.
  - **BullMQ Distributed Queueing:** Task decoupling with concurrency of 5 and 3 retry attempts using exponential backoff (initial delay: 1000ms).
  - **Stateful Redis Circuit Breaker:** Multi-state machine (`CLOSED`, `OPEN`, `HALF_OPEN`) tracking failure thresholds. Trips to `OPEN` on 3 consecutive upstream errors, executing instant failover from Primary (Groq Llama 3.3 70B) to Secondary (Gemini 1.5 Flash).
  - **Rolling Tenant Quotas:** Sliding 24-hour token consumption validation in PostgreSQL before queue ingestion.

### 2. APGCL Web Application & Administrative Dashboard
- **Context:** Assam Power Generation Corporation Limited (APGCL) Internship (2026).
- **Runtime & Stack:** PHP, Laravel, Livewire, MySQL, Tailwind CSS.
- **Features:**
  - **Administrative Authentication:** Secure user login and session management for administrative portal users.
  - **Transactional Notification Engine:** Automated email verification and notification workflows.
  - **Statutory Document Distribution:** Hierarchical document routing for electricity tariffs, Right to Information (RTI) disclosures, executive acts, and annual financial statements.

### 3. MicroBounty — Sandboxed Code Evaluation Engine
- **Stack:** Node.js, Express, Docker API, BullMQ, Redis, MongoDB Atlas.
- **Features:** Ephemeral Docker containers with resource limits (128MB RAM, 0.5 CPU) and BullMQ task queue buffering for automated code testing.

### 4. Crop Disease Detection Using Image Processing
- **Context:** Academic Research associated with National Institute of Technology Silchar (NIT Silchar).
- **Stack:** Python 3, OpenCV, TensorFlow, NumPy.
- **Pipeline:** Color space segmentation (HSV/LAB), bilateral filtering, and image processing for agricultural foliar disease identification.

### 5. SecureVault — Enterprise Document Storage Engine
- **Stack:** Python 3, Flask, 3NF Normalized MySQL, Isolated Chunk Store.
- **Verified Features:** Cryptographic SHA-256 streaming file deduplication and immutable audit trails without cloud vendor lock-in.

---

## ⚡ Interactive Components

1. **Animated Orbital Systems Canvas (`OrbitalVisual.astro`):**
   - Renders a multi-ring distributed systems topology with rotating satellites, pulsating nodes (Queue, Cache, Circuit Breaker, Compute, Persistence), and live telemetry tags.
   - Smooth 60fps CSS animations that fully respect `prefers-reduced-motion: reduce`.

2. **Interactive Circuit Breaker & Cache Simulator (`CircuitSimulator.astro`):**
   - Recruiter/developer interactive harness simulating the real Gateway logic.
   - Allows users to dispatch requests, verify sub-5ms SHA-256 cache hits on duplicate prompts, inject upstream HTTP 503 failures, and watch the Redis Circuit Breaker trip and fail over.

3. **Interactive Telemetry Terminal (`InteractiveTerminal.astro`):**
   - Embedded command-line console supporting commands such as `help`, `whoami`, `status`, `projects`, `stack`, `principles`, and `contact`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20.x` or higher (tested on Node `v24.21.0`)
- npm `v10.x` or higher

### Installation
```bash
# Clone repository
git clone https://github.com/MrinmoyBrh/My-Portfolio.git
cd My-Portfolio

# Install dependencies
npm install
```

### Development
```bash
npm run dev
```
Open `http://localhost:4321` in your browser.

### Production Build & Typecheck
```bash
npm run build
```
Generates optimized static assets in the `dist/` directory with zero errors and zero warnings.

### Preview Production Build
```bash
npm run preview
```

---

## ♿ Accessibility & Performance Verification

- **Keyboard Navigation:** Full tab order throughout the site with explicit `:focus-visible` styling (`outline: 2px solid #9CAF88`).
- **Skip Links:** Dedicated `<a href="#main-content" class="skip-to-content">` link for immediate keyboard bypass to main content.
- **Reduced Motion:** Automatic deactivation of all continuous orbital and pulse animations via `@media (prefers-reduced-motion: reduce)`.
- **Zero CLS & Minimal JavaScript:** Critical content renders as pure semantic HTML with minimal client-side hydration (<5kB JS bundle).
- **SEO & Social:** OpenGraph tags, Twitter Cards, canonical links, and JSON-LD `Person` schema.

---

## 👤 Author Coordinates

- **Mrinmoy Borah** — Backend Software Engineer
- **Education:** B.Tech CSE, Dhemaji Engineering College (2023 — 2027)
- **LinkedIn:** [https://www.linkedin.com/in/mrinmoy-borah-7771843b9/](https://www.linkedin.com/in/mrinmoy-borah-7771843b9/)
- **GitHub:** [https://github.com/MrinmoyBrh](https://github.com/MrinmoyBrh)
- **Email:** `mrinmoyborah360@gmail.com`
