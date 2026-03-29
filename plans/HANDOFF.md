# Jazz Caller — Session Handoff

> **Start here** when resuming in a new session. This is the TL;DR of everything decided.

---

## What We're Building

**Jazz Caller** — A premium, multi-tenant SaaS power dialer for B2B cold calling (India → USA).
Core UX: "Tinder for sales calls" — swipeable lead cards with one-tap calling via Telnyx WebRTC.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI Library | shadcn/ui + Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database/Auth | InsForge (MCP connected, API key in `.env`) |
| Telephony | Telnyx WebRTC SDK (per-user API keys) |
| Frontend Deploy | Vercel |
| Backend Deploy | Northflank (free sandbox) |
| Design Tool | Stitch (project below) |
| Component Library | 21st.dev Magic MCP (connected) |

---

## Key Architecture Decisions

1. **Multi-tenant**: Each user connects their OWN Telnyx account (API key + SIP Connection ID). Jazz Caller generates JWT tokens using their keys. Calls billed to their account.
2. **V1 = Personal instances**: No team/role features. Everyone has full access.
3. **V3+ = Team Spaces** (plugin, sellable add-on): Admins, shared campaigns, centralized leads.

---

## Design System: "Midnight Emerald"

- **Dark mode default** (light mode toggle)
- **Emerald Green** accent (#10B981) — Wise.com vibes
- **SF Pro / Inter** font stack
- **Glassmorphism** cards, pill buttons, circular action buttons (Tinder-style)
- Full details in `plans/DECISIONS.md` → Design System section

---

## Resources

| Resource | Location |
|---|---|
| All Decisions | `plans/DECISIONS.md` |
| V1 Implementation Plan | `plans/V1_IMPLEMENTATION.md` |
| Version Roadmap (V1-V4) | `plans/VERSIONS.md` |
| Stitch Prompts | `plans/STITCH_PROMPTS.md` |
| Stitch Project | https://stitch.withgoogle.com/projects/9879440586125450627 |
| Reference Photos | `photos_examples/` |
| InsForge Docs | `insforge.md` |
| InsForge MCP | Connected (API key in MCP config) |
| 21st.dev Magic MCP | Connected (component search/build/refine + logo search) |

---

## Stitch Screens (7 designed, ready for reference)

1. **Lead Card Swipe Dialer** — Main calling screen
2. **Premium Lead Dialer Variant** — Alt layout
3. **Active Call Interface** — In-call screen
4. **Call Disposition Summary** — Post-call buttons
5. **Campaigns Dashboard** — Home/campaign list
6. **Telephony & App Settings** — Telnyx setup
7. **Premium User Login** — Auth screen
8. **Create New Campaign** — CSV upload flow

---

## V1 Scope (what to build NOW)

- [ ] Monorepo setup (`client/` + `server/`)
- [ ] InsForge database schema (users, leads, campaigns, call_logs, user_settings)
- [ ] Auth (login/signup via InsForge)
- [ ] Settings page (connect Telnyx account)
- [ ] CSV upload + column mapping
- [ ] Campaign creation
- [ ] Lead card stack (swipeable, Framer Motion)
- [ ] Telnyx WebRTC calling (browser → phone)
- [ ] Post-call disposition panel
- [ ] Basic stats
- [ ] Dark/light mode

---

## Telnyx Setup Status

- ❌ Voice API Application NOT configured yet in Telnyx portal
- ❌ SIP Connection NOT created yet
- ✅ Phone number: +1 (407) 987-6902
- User needs to complete setup in Telnyx Mission Control before first call works

---

## How to Start

```
1. Read `plans/V1_IMPLEMENTATION.md` for the file-level build plan
2. Read `plans/DECISIONS.md` for all UX/design/architecture decisions
3. Reference Stitch project for visual designs
4. Start building Component 1 (Project Setup) first
```
