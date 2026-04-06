# DialerJazz — Core Multi-Agent Context

> **Source of truth** bridging AI agent sessions. Read this FIRST when resuming work.

---

## Current Phase

**V1 "First Call" — Shipped & Stabilizing**

The MVP is live at `jazzcaller.demgrow.space`. Core telephony (Telnyx WebRTC), campaign dialing, manual dialing, CSV import, lead management, call logging, and authentication are all working. Current focus is bug-fixing and UX polish.

---

## Core Technical Patterns

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS 3.4, shadcn/ui, Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database/Auth | InsForge (PostgreSQL BaaS with RLS) |
| Telephony | Telnyx WebRTC SDK (`@telnyx/webrtc`) |
| Deployment | Render (Docker multi-stage build) |
| Testing | Vitest (server-side only) |

### Database Schema (InsForge PostgreSQL)
5 tables, all with Row-Level Security:
- `user_settings` — Telnyx API key, SIP login, caller number per user
- `campaigns` — Name, status (draft/active/paused/completed), lead counts
- `leads` — Full contact fields, tags, custom_fields JSONB, dedup by phone
- `campaign_leads` — Junction table (many-to-many lead → campaign)
- `call_logs` — Call records with disposition, duration, provider call ID

### Authentication Flow
- InsForge Auth (email/password + GitHub OAuth + Google OAuth)
- `AuthContext.tsx` manages session, token caching, auto-refresh
- `api.ts` wraps fetch with auto 401 retry + silent token refresh
- Backend `auth.ts` middleware validates JWT `exp` claim, injects authenticated DB client

### Telephony Architecture
- **TelnyxContext.tsx** — Central state manager for all call operations
- **TelnyxProvider** wraps the app inside a layout route (in `App.tsx`) so SIP WebSocket persists across navigation
- Call states: `idle → trying → ringing → active → done`
- Multi-call support: primary call + held call + incoming call tracking
- `hungUpCallIdsRef` — Set that tracks intentionally hung-up calls to prevent zombie reconnections
- `activeCallRoute` — Tracks which page initiated the call (for ActiveCallBubble navigation)
- Global `<audio>` element in `DashboardLayout.tsx` keeps audio alive during navigation

### Key Architectural Decisions
1. **BYO Telephony** — Users connect their own Telnyx account. We generate JWT tokens using their stored API key.
2. **No swipe gestures** — Original plan had Tinder-style swiping. Actual implementation uses arrow buttons for next/previous lead navigation (more practical for desktop).
3. **Dialer modes** — Campaign dialer offers "Click to Call" (manual) and "Power" (auto-advance after disposition). Mode persists in localStorage.
4. **Frontend-heavy telephony** — WebRTC calling happens entirely in the browser via Telnyx SDK. Backend only generates auth tokens.

### File Structure (Key Files)
```
client/src/
├── App.tsx                          # Routes + TelnyxProvider layout wrapper
├── contexts/
│   ├── AuthContext.tsx               # Auth state + session management
│   └── TelnyxContext.tsx             # ALL call state (primary/held/incoming)
├── components/
│   ├── layout/DashboardLayout.tsx    # Sidebar + global overlays + audio element
│   ├── ActiveCallBubble.tsx          # Floating bubble for navigating back to call
│   ├── IncomingCallOverlay.tsx       # Full-screen incoming call (no active call)
│   ├── IncomingCallBanner.tsx        # Banner incoming call (during active call)
│   ├── HeldCallBubble.tsx            # Floating bubble for held calls
│   ├── CallControls.tsx              # Call/Hangup/Mute/Hold buttons
│   ├── DispositionOverlay.tsx        # Post-call disposition selection
│   ├── DTMFKeypad.tsx                # In-call numeric keypad
│   └── InCallHUD.tsx                 # Timer + call status during active call
├── pages/
│   ├── CampaignDialerPage.tsx        # Campaign dialer with lead cards
│   ├── ManualDialerPage.tsx          # Free-dial to any number
│   ├── CampaignsPage.tsx             # Campaign list + create modal
│   ├── LeadsPage.tsx                 # Lead table with filters
│   ├── CallLogsPage.tsx              # Call history
│   ├── ConnectorsPage.tsx            # Telnyx credentials setup
│   └── SettingsPage.tsx              # User profile + app settings
server/src/
├── index.ts                          # Express entry, CORS, routes
├── routes/
│   ├── leads.ts, campaigns.ts, calls.ts, telnyx.ts, settings.ts, stats.ts
├── middleware/
│   ├── auth.ts                       # JWT validation + RLS injection
│   └── errorHandler.ts               # Consistent error response shape
```

---

## What Actually Works (V1 Status — April 2026)

### ✅ Fully Working
- Email/password + OAuth login
- Campaign CRUD (create, rename, delete, status toggle)
- CSV upload with column mapping + phone dedup
- Campaign dialer with lead card navigation (next/previous)
- Manual dialer (dial any number)
- Telnyx WebRTC calling (outbound from browser)
- Call controls: mute, hold, DTMF keypad
- Post-call disposition overlay (6 options + notes)
- Call logging to database
- Incoming call detection (overlay + banner)
- Multi-call management (hold + answer incoming)
- Active call bubble (persists across navigation)
- Global audio element (call audio survives page changes)
- Zombie call prevention (early hangup works correctly)
- Dialer mode persistence (click-to-call vs power mode saved in localStorage)
- Lead browsing history (can go back to already-dialed leads, shows checkmark)

### ⚠️ Partially Working / Untested
- Incoming call answering (code is correct per Telnyx SDK patterns, but untested with real inbound calls)
- Hold & answer flow (code implemented, needs real multi-call testing)

### ❌ Not Built Yet (V2+ Roadmap)
- Twilio / Plivo provider support (Telnyx only)
- Call recording
- Analytics dashboard charts
- Callback scheduling
- Team/multi-user features
- Mobile app
- Swipe gestures (planned but not implemented — using button navigation)
- Light mode toggle

---

## Agent Work History

- **2026-04-06** — Documentation restructure: Migrated from flat `plans/` to `docs/plans/` department structure per managing-project-documentation skill. Fixed CONTRIBUTING.md and SECURITY.md for accuracy. Created core-main-goals.md and core-multi-agent-context.md as living documents.

- **2026-04-04** — Multi-call UX bug fixes: (1) Fixed ActiveCallBubble not appearing after navigating away — removed cleanup that cleared `activeCallRoute` on unmount. (2) Added global `<audio>` element in DashboardLayout so call audio persists across navigation. (3) Fixed zombie calls surviving early hangup by tracking hung-up call IDs in a Set + adding `new`/`connecting` SDK states. (4) Fixed bubble routing to wrong page by guarding `setActiveCallRoute` — only sets on mount if no call is active. (5) Fixed route matching — bubble now hides only on exact dialer pages.

- **2026-04-03** — Open-source prep: Added README, LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, PR template, issue templates. Configured GitHub repo metadata.

- **2026-03-31** — Lead browsing history fix: Removed restrictive filtering that hid dialed leads. Added visual checkmark badge for completed leads. Added localStorage persistence for dialer mode.

- **2026-03-30** — Telephony integration: Built TelnyxContext with full call lifecycle, incoming call handling, hold/unhold, DTMF. Built IncomingCallOverlay, IncomingCallBanner, HeldCallBubble, ActiveCallBubble. Moved TelnyxProvider into layout route for persistent SIP connection.

- **2026-03-29** — Campaign dialer: Built CampaignDialerPage with lead card navigation, CallControls, DispositionOverlay, DTMFKeypad, InCallHUD, AudioVisualizer. Implemented dialer mode selection (click-to-call vs power).

- **2026-03-28** — Core app build: Dashboard, CampaignsPage with create modal (CSV upload + column mapping), LeadsPage, CallLogsPage, ConnectorsPage (Telnyx setup), SettingsPage. Authentication flow with AuthContext.

- **2026-03-27** — Project kickoff: Brainstormed UX, created design system ("Midnight Emerald"), set up monorepo structure, InsForge database schema, Express API routes.
