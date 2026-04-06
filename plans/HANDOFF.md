# DialerJazz — Session Handoff

> **Start here** when resuming in a new session. This is the TL;DR of everything.

---

## What This Is

**DialerJazz** — An open-source power dialer for B2B cold calling with a premium card-based UI.
Users connect their own Telnyx account and make WebRTC calls directly from the browser.

**Status:** V1 shipped and live at `jazzcaller.demgrow.space`

---

## Documentation Structure

All planning and context lives in `docs/plans/` organized by department:

```
docs/plans/
├── core/
│   ├── core-main-goals.md              # Business objectives
│   └── core-multi-agent-context.md     # ⭐ READ THIS FIRST — tech context + work history
├── design/
│   ├── design-main-goals.md            # Design system ("Midnight Emerald")
│   └── 2026-03-27-stitch-prompts.md    # Stitch design tool prompts
└── roadmap/
    └── roadmap-versions.md             # V1-V4 feature roadmap
```

### Critical Reading Order
1. **`docs/plans/core/core-multi-agent-context.md`** — Tech stack, architecture, what works, what doesn't, agent work history
2. **`docs/plans/core/core-main-goals.md`** — Business goals and version milestones
3. **`docs/plans/roadmap/roadmap-versions.md`** — Detailed feature checklists per version

---

## Quick Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS 3.4, shadcn/ui, Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database/Auth | InsForge (PostgreSQL BaaS with RLS) |
| Telephony | Telnyx WebRTC SDK |
| Deployment | Render (Docker) |

---

## How to Start Working

```
1. Read docs/plans/core/core-multi-agent-context.md for full context
2. Run: npm run install:all && npm run dev
3. Refer to roadmap-versions.md for next features to build
```
