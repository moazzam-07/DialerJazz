# Jazz Caller — Versioned Implementation Plan

---

## Version Roadmap Overview

| Version | Codename | Focus | Timeline |
|---|---|---|---|
| **V1** | "First Call" | Preview Dialer + Dating-App UX + Telnyx WebRTC | 1-2 weeks |
| **V2** | "Machine" | Power Dialer + Auto-Dial + Call Recording + Analytics | 1 week |
| **V3** | "Switchboard" | Multi-Provider (Twilio/Plivo) + CRM Integration + Campaigns | 1-2 weeks |
| **V4** | "Enterprise" | Predictive Dialer + Team Support + TCPA Compliance + Mobile | 2-3 weeks |

---

# V1 — "First Call" (MVP)

> Preview Dialer with Dating-App card UX. One user, one provider (Telnyx), browser-based.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript |
| UI Framework | shadcn/ui + Framer Motion (for swipe animations) |
| Swipe Cards | `react-tinder-card` or custom Framer Motion cards |
| Backend | Node.js + Express + TypeScript |
| Database/Auth/Storage | InsForge (PostgreSQL, agent-native BaaS) |
| Telephony | Telnyx WebRTC SDK (user connects own account) |
| Real-time | Socket.io (call state sync) |
| Auth | InsForge Auth (email/password) |
| Hosting | Vercel (frontend) + Northflank (backend, free sandbox) |

## Dating-App UX — "Lead Cards" Brainstorm

### Gesture Mapping

```
┌─────────────────────────────────────────┐
│                                         │
│   ← SWIPE LEFT                          │
│   Skip this lead (move to next)         │
│                                         │
│   → SWIPE RIGHT                         │
│   Call this lead (initiates dial)       │
│                                         │
│   ↑ SWIPE UP                            │
│   Mark as "Hot Lead" / Priority         │
│                                         │
│   ↓ SWIPE DOWN                          │
│   Reject / DNC (Do Not Call)            │
│                                         │
│   TAP CARD                              │
│   Expand full lead details              │
│                                         │
│   LONG PRESS                            │
│   Add note / edit lead info             │
│                                         │
└─────────────────────────────────────────┘
```

### Lead Card Layout

```
┌─────────────────────────────────────────┐
│  ┌─────┐                                │
│  │ 🏢  │  Acme Auto Detailing           │
│  └─────┘  San Francisco, CA 94102       │
│                                         │
│  👤 John Smith — Owner                  │
│  📞 +1 (415) 555-0123                   │
│  🌐 acmedetailing.com                   │
│  ⭐ Google: 4.2 (128 reviews)           │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │ Notes: "Has 3 locations, growing"   │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─────┐  ┌──────────┐  ┌─────┐        │
│  │  ✕  │  │ 📞 CALL  │  │  ♡  │        │
│  │Skip │  │          │  │Save │        │
│  └─────┘  └──────────┘  └─────┘        │
│                                         │
│           Card 3 of 247                 │
└─────────────────────────────────────────┘
```

### Post-Call Disposition Screen

After a call ends, a bottom sheet slides up with quick-tap dispositions:

```
┌─────────────────────────────────────────┐
│  Call ended — 2:34                      │
│                                         │
│  How did it go?                         │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ 🔥 Hot   │  │ 🤝 Warm  │            │
│  │ Lead     │  │ Follow-up│            │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │ ❄️ Cold   │  │ 📵 No    │            │
│  │ Not Now  │  │ Answer   │            │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │ 📫 Voice │  │ 🚫 DNC   │            │
│  │ mail     │  │ Remove   │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  📝 Add note... [________________]     │
│                                         │
│  [       NEXT LEAD →       ]           │
└─────────────────────────────────────────┘
```

### Navigation Between Leads

- **Horizontal swipe** = Navigate between leads (left/right)
- **Card stack visual** = 3 cards visible (current + 2 behind, offset)
- **Undo** = Shake phone or Ctrl+Z to go back to previous lead
- **Keyboard shortcuts** (desktop):
  - `Space` = Call
  - `→` = Skip
  - `←` = Go back
  - `↑` = Mark hot
  - `↓` = Reject/DNC
  - `Esc` = Pause campaign
  - `N` = Add note

## V1 Features Checklist

### Core
- [ ] User authentication (Supabase Auth)
- [ ] CSV lead upload with column mapping UI
- [ ] Lead card stack with swipe gestures (Framer Motion)
- [ ] Click "Call" → Telnyx WebRTC outbound call
- [ ] Live audio (speak + hear) via browser
- [ ] Call timer display
- [ ] Hang up button
- [ ] Post-call disposition selection
- [ ] Lead status tracking (New → Called → Hot → Cold → DNC)
- [ ] Basic lead list/table view (alternate to card view)

### Telephony (Telnyx Only)
- [ ] Telnyx WebRTC SDK integration
- [ ] Outbound calls from browser
- [ ] Caller ID display (your Telnyx number)
- [ ] DTMF keypad (for navigating IVRs)
- [ ] Mute/unmute
- [ ] Call state management (ringing → connected → ended)

### Data
- [ ] Supabase tables: leads, campaigns, call_logs, dispositions
- [ ] CSV parser with preview + column mapping
- [ ] Lead deduplication on upload
- [ ] Basic search/filter leads

### UI/UX
- [ ] Dark mode by default (premium feel)
- [ ] Smooth card animations (spring physics)
- [ ] Responsive — works on laptop + tablet browsers
- [ ] Call status bar (persistent during call)
- [ ] Campaign progress indicator

---

# V2 — "Machine" (Power Dialer + Analytics)

> Auto-dial mode, call recording, transcription, real-time dashboard.

## New Features

### Power Dialer Mode
- [ ] Auto-dial next lead after disposition (configurable delay: 0–10 sec)
- [ ] Click-to-Call mode (manual trigger per lead)
- [ ] Dialer mode selection in campaign settings
- [ ] Pause/resume campaign mid-session
- [ ] Skip rules (auto-skip leads with no phone, DNC, already called today)

### Call Recording & Transcription
- [ ] Telnyx call recording API integration
- [ ] Recording playback in lead detail view
- [ ] Recording storage (Supabase Storage or S3)
- [ ] Whisper/Deepgram transcription of recordings
- [ ] Transcription display alongside recording

### Analytics Dashboard
- [ ] Today's stats: calls made, connected, avg duration, conversion rate
- [ ] Campaign stats: total leads, reached, pending, completion %
- [ ] Time-of-day heatmap (best times to call)
- [ ] Disposition breakdown (pie chart)
- [ ] Call history timeline
- [ ] Lead funnel visualization

### Quality of Life
- [ ] Call notes with auto-save
- [ ] "Callback" scheduling — set reminder to call lead back at specific time
- [ ] Lead tagging system
- [ ] Timezone display per lead (detect from area code)
- [ ] Calling hours enforcement (8AM–9PM lead's local time)

---

# V3 — "Switchboard" (Multi-Provider + CRM)

> Provider-agnostic telephony, CRM integration, campaign management.

## Provider Abstraction Layer

```
┌──────────────────────────────────────┐
│          Jazz Caller App             │
├──────────────────────────────────────┤
│       Telephony Adapter Layer        │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Telnyx │ │ Twilio │ │ Plivo  │   │
│  │Adapter │ │Adapter │ │Adapter │   │
│  └───┬────┘ └───┬────┘ └───┬────┘   │
│      │          │          │         │
│  ┌───┴──────────┴──────────┴─────┐   │
│  │    Unified Call Interface     │   │
│  │  .call() .hangup() .mute()   │   │
│  │  .hold() .transfer() .dtmf() │   │
│  └───────────────────────────────┘   │
└──────────────────────────────────────┘
```

### New Features

- [ ] Provider selection in settings (Telnyx / Twilio / Plivo)
- [ ] Provider credentials management (API keys per provider)
- [ ] Unified call interface — same UI regardless of provider
- [ ] Twilio WebRTC adapter (Twilio Client SDK)
- [ ] Plivo WebRTC adapter (Plivo Browser SDK)
- [ ] Local presence dialing (use area code matching lead's location)
- [ ] Multiple phone numbers management

### CRM Integration
- [ ] Built-in mini-CRM: contacts, companies, deals pipeline
- [ ] HubSpot integration (sync leads, log calls, create contacts)
- [ ] Airtable integration (read/write leads, log calls)
- [ ] Jazz Caller REST API for external integrations
- [ ] Webhook support (call events → your CRM)
- [ ] Auto-log: every call → CRM entry with duration, outcome, recording URL

### Campaign Management
- [ ] Create multiple campaigns with separate lead lists
- [ ] Campaign scheduling (run Mon–Fri, 9AM–5PM EST)
- [ ] Campaign cloning
- [ ] A/B testing scripts (different pitches per campaign)
- [ ] Lead reassignment between campaigns
- [ ] Campaign-level analytics

---

# V4 — "Enterprise" (Scale & Compliance)

> Multi-user, predictive dialing, TCPA compliance, mobile apps.

### Predictive Dialer
- [ ] Dial ratio algorithm (dial X numbers per available agent)
- [ ] Answering machine detection (AMD via Telnyx/Twilio)
- [ ] Auto-voicemail drop
- [ ] Adaptive dial pacing based on connect rate

### TCPA Compliance (Layer 1)
- [ ] DNC list integration (National Do Not Call Registry API)
- [ ] Auto-scrub lists every 31 days
- [ ] Calling hours enforcement with per-state rules
- [ ] Consent tracking per lead
- [ ] Call recording consent announcements
- [ ] Compliance audit log

### Team Features
- [ ] Multi-user support with roles (admin, caller, manager)
- [ ] Live call monitoring (manager listens in)
- [ ] Whisper coaching (manager speaks to agent only)
- [ ] Team leaderboard & performance metrics
- [ ] Call assignment rules

### Mobile
- [ ] Progressive Web App (PWA) with offline lead viewing
- [ ] React Native app (Android + iOS) using Telnyx RN SDK
- [ ] Push notifications for callbacks
- [ ] Mobile-optimized card swipe UX

### Advanced
- [ ] AI call summary (GPT-powered post-call notes)
- [ ] Voicemail detection + auto-skip
- [ ] SMS follow-up automation (text after call)
- [ ] Email follow-up templates
- [ ] Custom fields on leads
- [ ] Lead scoring algorithm
- [ ] Data enrichment API integration (Apollo, ZoomInfo)

---

## Architecture Overview (All Versions)

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│        React + Vite + TypeScript                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ Card UX  │ │ Dialer   │ │Dashboard │       │
│   │ (Swipe)  │ │ Controls │ │Analytics │       │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│        └─────────────┼───────────┘               │
│                      │ WebSocket + REST           │
├──────────────────────┼──────────────────────────┤
│                   BACKEND                        │
│        Node.js + Express + TypeScript            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ Campaign │ │ Call     │ │ Webhook  │       │
│   │ Manager  │ │ Engine   │ │ Handler  │       │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│        │             │            │              │
│   ┌────┴─────────────┴────────────┴─────┐       │
│   │     Telephony Adapter Layer         │       │
│   │  Telnyx │ Twilio │ Plivo │ Custom   │       │
│   └────┬────────┬────────┬──────────────┘       │
├────────┼────────┼────────┼──────────────────────┤
│        │    TELEPHONY PROVIDERS                  │
│        │    (WebRTC + Voice API)                 │
├──────────────────────────────────────────────────┤
│                  DATABASE                        │
│           Supabase (PostgreSQL)                  │
│   Tables: users, leads, campaigns, call_logs,   │
│           dispositions, recordings, settings     │
└──────────────────────────────────────────────────┘
```

---

## Database Schema (V1) — InsForge PostgreSQL

```sql
-- Users (managed by InsForge Auth)

-- User settings (stores Telnyx credentials per user)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  telnyx_api_key TEXT, -- encrypted
  telnyx_sip_connection_id TEXT,
  telnyx_phone_number TEXT,
  default_caller_id TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- leads
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  google_rating DECIMAL,
  review_count INT,
  business_category TEXT,
  notes TEXT,
  tags TEXT[], -- array of tag strings
  status TEXT DEFAULT 'new', -- new, called, interested, follow_up, not_interested, no_answer, wrong_number, dnc
  priority INT DEFAULT 0,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dialer_mode TEXT DEFAULT 'preview', -- preview, power, click_to_call
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  total_leads INT DEFAULT 0,
  leads_called INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- call_logs
CREATE TABLE call_logs (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID NOT NULL,
  provider TEXT DEFAULT 'telnyx',
  provider_call_id TEXT,
  direction TEXT DEFAULT 'outbound',
  from_number TEXT,
  to_number TEXT,
  status TEXT, -- initiated, ringing, answered, completed, failed, no-answer, busy
  disposition TEXT, -- interested, follow_up, not_interested, no_answer, wrong_number, dnc
  disposition_sub TEXT, -- voicemail, busy (sub-types under no_answer)
  duration_seconds INT,
  recording_url TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## V1 Verification Plan

### Automated
- Unit tests for CSV parser (various formats, edge cases)
- Unit tests for lead deduplication logic
- Integration test: Telnyx WebRTC connection establishment
- API endpoint tests (upload CSV, get leads, log call)

### Manual / Browser Testing
- Upload a CSV → verify leads appear as cards
- Swipe through leads → verify animations and state updates
- Click Call → verify Telnyx WebRTC dials the number
- Complete a call → verify disposition screen appears
- Log disposition → verify lead status updates in database
- Test on Chrome, Edge, Firefox
- Test with keyboard shortcuts on desktop

### User Testing
- Moazzam: Make 5 real test calls to your own phone
- Verify audio quality from India → USA
- Test on wired vs WiFi internet
