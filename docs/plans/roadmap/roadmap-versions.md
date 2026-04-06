# Roadmap — Version Plan

> Detailed feature roadmap from V1 (shipped) through V4 (future).

---

## Version Overview

| Version | Codename | Status | Focus |
|---|---|---|---|
| **V1** | "First Call" | ✅ Shipped | MVP — Card UX + Telnyx WebRTC + Campaigns + Manual Dialer |
| **V2** | "Machine" | 🔲 Planned | Power Dialer + Call Recording + Analytics |
| **V3** | "Switchboard" | 🔲 Planned | Multi-Provider + CRM Integration + Teams |
| **V4** | "Enterprise" | 🔲 Planned | Predictive Dialer + Compliance + Mobile |

---

## V1 — "First Call" ✅ SHIPPED

> MVP with card-based lead navigation, Telnyx WebRTC calling, campaign management.

### What Shipped
- [x] Monorepo setup (client + server)
- [x] InsForge database (5 tables with RLS)
- [x] Auth (email/password + GitHub + Google OAuth)
- [x] CSV upload with column mapping + phone dedup
- [x] Campaign CRUD (create, rename, delete, status toggle)
- [x] Campaign dialer with lead card navigation
- [x] Manual dialer (dial any number)
- [x] Telnyx WebRTC calling (browser → phone)
- [x] Call controls (mute, hold, DTMF keypad)
- [x] Post-call disposition (6 options + notes)
- [x] Call logging to database
- [x] Incoming call detection (overlay + banner)
- [x] Multi-call management (hold + answer)
- [x] Active call bubble (persists across navigation)
- [x] Lead list view with search/filter
- [x] Call logs page
- [x] Connectors page (Telnyx setup)
- [x] Settings page
- [x] Docker deployment (Render)
- [x] Dark mode (default and only mode currently)

### What Didn't Ship (Moved to V2+)
- [ ] Swipe gestures (using button navigation instead)
- [ ] Light mode toggle
- [ ] Keyboard shortcuts (Space, arrows, etc.)

---

## V2 — "Machine" (Planned)

> Auto-dial enhancements, call recording, transcription, analytics.

### Features
- [ ] Auto-dial next lead after disposition (configurable delay: 0–10 sec)
- [ ] Pause/resume campaign mid-session
- [ ] Skip rules (auto-skip leads with no phone, DNC, already called today)
- [ ] Telnyx call recording API integration
- [ ] Recording playback in lead detail view
- [ ] Whisper/Deepgram transcription of recordings
- [ ] Analytics dashboard (calls today, connected %, avg duration)
- [ ] Disposition breakdown charts
- [ ] Time-of-day heatmap
- [ ] Callback scheduling with reminders
- [ ] Timezone display per lead
- [ ] Calling hours enforcement (8AM–9PM lead's local time)

---

## V3 — "Switchboard" (Planned)

> Multi-provider telephony, CRM integration, team features.

### Features
- [ ] Provider abstraction layer (unified call interface)
- [ ] Twilio WebRTC adapter
- [ ] Plivo WebRTC adapter
- [ ] Provider credential management per user
- [ ] Local presence dialing
- [ ] Built-in mini-CRM (contacts, companies, deals)
- [ ] HubSpot integration
- [ ] Webhook support (call events → external systems)
- [ ] Team Spaces (multi-user with roles)
- [ ] Campaign scheduling
- [ ] REST API for external integrations

---

## V4 — "Enterprise" (Planned)

> Predictive dialing, compliance, mobile apps.

### Features
- [ ] Predictive dialer (dial ratio algorithm)
- [ ] Answering machine detection (AMD)
- [ ] Auto-voicemail drop
- [ ] DNC list integration (National Do Not Call Registry)
- [ ] TCPA compliance (per-state calling hours, consent tracking)
- [ ] Multi-user roles (admin, caller, manager)
- [ ] Live call monitoring + whisper coaching
- [ ] Team leaderboard
- [ ] PWA + React Native mobile app
- [ ] AI call summaries
- [ ] SMS/email follow-up automation
