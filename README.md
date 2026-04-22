<div align="center">
  <img src="./logo.png" alt="DialerJazz Logo" width="70%"/>

  # DialerJazz
  **Open-Source Power Dialer — Tinder for Sales Calls**

  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
  [![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js_22-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

  [Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API](#-api-reference) • [Docker](#-docker) • [Contributing](#-contributing)
</div>

<br />

## 🌟 The Pitch

**DialerJazz is the world's most beautiful open-source Power Dialer.** It completely reimagines the outbound sales experience by replacing boring spreadsheet-like UIs with a gamified workflow featuring an unmatched premium design.

Three distinct calling modes:
- 🔥 **Tinder Mode:** Rapidly swipe through leads with our signature gamified UI.
- ⚡ **Power Mode:** Automated, high-velocity sequential dialing to maximize connect rates.
- 📞 **Normal Mode:** Traditional, controlled single-dial workflows with a premium facelift.

DialerJazz offers universal connectivity—hook into **Telnyx, Twilio, or any custom WebRTC** provider out of the box.

## ✨ Features

| Category | Details |
|----------|---------|
| **Dialer** | Tinder-style swipe UI, power dialing, manual dialer, WebRTC calls via Telnyx |
| **CRM** | Lead management, CSV import, company/contact tracking, disposition workflow |
| **Campaigns** | Create campaigns, assign leads, track progress, filter by status |
| **Auth** | Email/password, Google OAuth, email verification with OTP, password recovery |
| **Dashboard** | Real-time stats, campaign overview table, quick actions |
| **Pagination** | Server-side offset pagination across all list endpoints with standardized `meta` |
| **UI/UX** | KokonutUI dark theme, collapsible sidebar, Framer Motion animations, responsive |
| **Infra** | Docker-ready, rate limiting, Zod validation, centralized error handling |

## 🚀 Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/) & npm
- An [InsForge](https://insforge.app) project (provides Postgres, Auth, Storage)
- A [Telnyx](https://telnyx.com) account (for WebRTC calling)

### Installation

```bash
# 1. Clone
git clone https://github.com/moazzam-07/DialerJazz.git
cd DialerJazz

# 2. Install all dependencies (client + server)
npm run install:all

# 3. Configure environment
cp .env.example .env
# Edit .env with your InsForge and Telnyx credentials

# 4. Run the full stack (client on :5173, server on :3001)
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INSFORGE_API_KEY` | ✅ | InsForge admin API key (server-side) |
| `INSFORGE_BASE_URL` | ✅ | InsForge project URL |
| `INSFORGE_ANON_KEY` | ✅ | InsForge anonymous/public key |
| `VITE_INSFORGE_BASE_URL` | ✅ | Same URL, baked into client at build time |
| `VITE_INSFORGE_ANON_KEY` | ✅ | Same anon key, baked into client |
| `VITE_API_URL` | — | API base URL (defaults to `/api`) |
| `JWT_SECRET` | ✅ | Secret for JWT token verification |
| `FRONTEND_URL` | — | CORS allowed origin (defaults to `http://localhost:5173`) |
| `PORT` | — | Server port (defaults to `3001`) |

## 🏗 Architecture

```
DialerJazz/
├── client/                     # React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # UI components (ShadCN, custom)
│   │   │   ├── ui/             # Reusable UI primitives
│   │   │   └── layout/         # Dashboard layout, sidebar
│   │   ├── hooks/              # Custom hooks (usePagination, etc.)
│   │   ├── contexts/           # Auth context provider
│   │   ├── lib/                # API client, utilities, InsForge SDK
│   │   └── pages/              # Route-level page components
│   └── tailwind.config.js
│
├── server/                     # Express + TypeScript
│   └── src/
│       ├── routes/             # REST API route handlers
│       │   ├── campaigns.ts    # CRUD + server-side pagination
│       │   ├── leads.ts        # CRM + bulk import + pagination
│       │   ├── calls.ts        # Call logging + stats + pagination
│       │   ├── settings.ts     # User settings (Telnyx config)
│       │   └── telnyx.ts       # WebRTC token generation
│       ├── middleware/         # Auth, error handling
│       ├── services/           # Business logic
│       └── index.ts            # Express + Socket.io entry point
│
├── Dockerfile                  # Multi-stage production build
└── .env.example                # Environment template
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 3.4, Framer Motion, ShadCN/Radix |
| Backend | Node.js 22, Express, TypeScript, Zod, Socket.io |
| Database | PostgreSQL via InsForge (PostgREST API) |
| Auth | InsForge Auth (email/password, Google OAuth, OTP verification) |
| Calling | Telnyx WebRTC SDK |
| Deployment | Docker (multi-stage), any cloud provider |

## 📡 API Reference

All list endpoints support **server-side offset pagination** with standardized responses.

### Pagination

```
GET /api/campaigns?page=2&per_page=10
```

**Response format:**
```json
{
  "data": [...],
  "meta": {
    "total": 142,
    "page": 2,
    "per_page": 10,
    "total_pages": 15
  }
}
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/campaigns?page=&per_page=` | List campaigns (paginated) |
| `GET` | `/api/campaigns/:id` | Get single campaign |
| `POST` | `/api/campaigns` | Create campaign |
| `PATCH` | `/api/campaigns/:id/status` | Update campaign status |
| `PATCH` | `/api/campaigns/:id/rename` | Rename campaign |
| `DELETE` | `/api/campaigns/:id` | Delete campaign |
| `GET` | `/api/leads?page=&per_page=` | List all CRM leads (paginated) |
| `GET` | `/api/leads/campaign/:id` | Leads by campaign |
| `POST` | `/api/leads/bulk` | Bulk CSV import |
| `POST` | `/api/leads/assign` | Assign leads to campaign |
| `PATCH` | `/api/leads/:id/disposition` | Update lead disposition |
| `GET` | `/api/calls?page=&per_page=` | List call logs (paginated) |
| `POST` | `/api/calls/log` | Log a completed call |
| `GET` | `/api/calls/stats` | Aggregated call statistics |
| `GET` | `/api/settings` | Get user settings |
| `PUT` | `/api/settings` | Update settings |
| `POST` | `/api/telnyx/token` | Generate WebRTC token |
| `GET` | `/api/health` | Health check |

## 🐳 Docker

```bash
# Build
docker build \
  --build-arg VITE_INSFORGE_BASE_URL=https://your-app.region.insforge.app \
  --build-arg VITE_INSFORGE_ANON_KEY=your-anon-key \
  -t dialerjazz .

# Run
docker run -d \
  -p 3001:3001 \
  -e INSFORGE_API_KEY=your-api-key \
  -e INSFORGE_BASE_URL=https://your-app.region.insforge.app \
  -e INSFORGE_ANON_KEY=your-anon-key \
  -e JWT_SECRET=your-secret \
  dialerjazz
```

The Docker image uses a multi-stage build:
1. **Stage 1 (Builder):** Installs dependencies, builds client with Vite (VITE_ vars baked in)
2. **Stage 2 (Production):** Copies server source + built client, runs via `tsx` for ESM support

The server serves the built client as static files and proxies `/api/*` to the Express backend.

## 🤝 Contributing

We love contributions! Whether it's adding new features, fixing bugs, or improving documentation, check out our [Contributing Guide](CONTRIBUTING.md).

Please ensure you adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛡️ Security

If you discover a security vulnerability, please consult our [Security Policy](SECURITY.md) for reporting guidelines.

## 📄 License

DialerJazz is open-sourced software licensed under the [MIT License](LICENSE).
