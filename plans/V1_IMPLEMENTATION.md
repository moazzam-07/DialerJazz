# Jazz Caller V1 — Detailed Implementation Plan

> **Goal**: Build a working preview dialer MVP with dating-app card UX, Telnyx WebRTC calling, and InsForge backend.

---

## Proposed Changes

### Component 1: Project Setup & Infrastructure

#### [NEW] `package.json` — Root monorepo config
- Monorepo with `client/` (React Vite) and `server/` (Node Express)

#### [NEW] `client/` — React + Vite + TypeScript frontend
- Initialize with `npx create-vite@latest ./ --template react-ts`
- Install: `@telnyx/webrtc`, `framer-motion`, `react-tinder-card`, `lucide-react`, `papaparse`

#### [NEW] `server/` — Node.js + Express + TypeScript backend
- Initialize with `npm init`, install: `express`, `@telnyx/telnyx-node`, `cors`, `dotenv`, `socket.io`, `multer`, `papaparse`

#### [NEW] `.env.example` — Environment variables template
```
# InsForge
INSFORGE_API_KEY=
INSFORGE_API_BASE_URL=

# App
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
PORT=3001
```

> Note: Telnyx API keys are stored PER USER in the database, not in env vars.

---

### Component 2: InsForge Database

#### [NEW] InsForge migration — `create_core_tables`
- Tables: `user_settings`, `leads`, `campaigns`, `call_logs` (schema from VERSIONS.md)
- RLS policies: user can only access own data
- Indexes on `leads.campaign_id`, `leads.status`, `call_logs.lead_id`

---

### Component 3: Backend API (Express)

#### [NEW] `server/src/index.ts` — Express server entry
- CORS, JSON parsing, Socket.io setup

#### [NEW] `server/src/routes/leads.ts`
- `POST /api/leads/upload` — CSV upload + parse + insert into InsForge
- `GET /api/leads?campaign_id=` — Paginated lead list
- `PATCH /api/leads/:id` — Update lead status/notes
- `DELETE /api/leads/:id` — Remove a lead

#### [NEW] `server/src/routes/campaigns.ts`
- `POST /api/campaigns` — Create campaign
- `GET /api/campaigns` — List user's campaigns
- `PATCH /api/campaigns/:id` — Update campaign
- `GET /api/campaigns/:id/stats` — Campaign statistics

#### [NEW] `server/src/routes/calls.ts`
- `POST /api/calls/log` — Log a completed call with disposition
- `GET /api/calls?lead_id=` — Call history for a lead

#### [NEW] `server/src/routes/telnyx.ts`
- `POST /api/telnyx/token` — Generate Telnyx WebRTC JWT using the USER's stored API key
- `POST /api/telnyx/webhook` — Handle Telnyx call event webhooks

#### [NEW] `server/src/routes/settings.ts`
- `GET /api/settings` — Get user settings (Telnyx creds masked)
- `PUT /api/settings` — Update user settings (Telnyx API key, SIP connection, phone number, theme)

#### [NEW] `server/src/services/csv-parser.ts`
- Parse CSV with column auto-detection
- Return preview (first 5 rows) + column mapping suggestions
- Handle various delimiters (comma, tab, semicolon)
- Deduplication by phone number

---

### Component 4: Frontend — Core Layout

#### [NEW] `client/src/App.tsx` — Root with routing
- Routes: `/login`, `/dashboard`, `/campaign/:id/dial`, `/leads`, `/settings`

#### [NEW] `client/src/index.css` — Design system
- Dark mode palette, CSS variables, typography (Inter font)
- Card styles, glassmorphism effects, animation tokens

#### [NEW] `client/src/lib/insforge.ts` — InsForge client init
#### [NEW] `client/src/lib/telnyx.ts` — Telnyx WebRTC client wrapper

---

### Component 5: Frontend — Authentication

#### [NEW] `client/src/pages/LoginPage.tsx`
- Email + password login via InsForge Auth
- Simple, premium-looking login screen

---

### Component 6: Frontend — Dashboard

#### [NEW] `client/src/pages/Dashboard.tsx`
- Campaign list with cards
- "New Campaign" button
- Quick stats (total calls today, leads remaining)
- Telnyx connection status indicator (connected/not configured)

#### [NEW] `client/src/components/CampaignCard.tsx`
- Shows campaign name, progress bar, lead count, status

---

### Component 7: Frontend — CSV Upload Flow

#### [NEW] `client/src/pages/UploadPage.tsx`
- Drag-and-drop CSV upload zone
- Step 1: Upload → Step 2: Column mapping → Step 3: Preview → Step 4: Confirm

#### [NEW] `client/src/components/ColumnMapper.tsx`
- Map CSV columns to lead fields (first_name, phone, company, etc.)
- Auto-detect common column names

---

### Component 8: Frontend — Lead Card Stack (The Dating-App UX) ⭐

#### [NEW] `client/src/pages/DialerPage.tsx`
- Main dialing screen — shows card stack + call controls
- Manages dialer state machine: idle → previewing → calling → in_call → disposition → next

#### [NEW] `client/src/components/LeadCardStack.tsx`
- Renders 3 stacked cards with depth effect
- Uses `react-tinder-card` or Framer Motion for swipe gestures
- Swipe right = call, left = skip, up = priority, down = reject

#### [NEW] `client/src/components/LeadCard.tsx`
- Individual lead card with company icon, contact info, notes
- Expandable on tap for full details
- Color-coded status indicator

#### [NEW] `client/src/components/CallControls.tsx`
- During call: timer, mute, keypad, hang up
- Animated waveform/pulse during active call

#### [NEW] `client/src/components/DispositionPanel.tsx`
- Bottom sheet after call ends
- Quick-tap disposition buttons (Hot, Warm, Cold, No Answer, Voicemail, DNC)
- Optional note text field
- "Next Lead" button

#### [NEW] `client/src/components/DTMFKeypad.tsx`
- Numeric keypad for navigating IVRs during call

---

### Component 9: Frontend — Lead List View

#### [NEW] `client/src/pages/LeadsPage.tsx`
- Table/list view of all leads with filters (status, campaign)
- Search by name/company/phone
- Click to view lead detail

---

### Component 10: Telephony — Telnyx WebRTC Integration

#### [NEW] `client/src/hooks/useTelnyxCall.ts`
- Custom React hook wrapping Telnyx WebRTC SDK
- Handles: connect, call, answer, hangup, mute, dtmf
- Exposes: callState, duration, isMuted, error
- Auto-reconnect on connection drop (for Indian internet)

#### [NEW] `server/src/services/telnyx-auth.ts`
- Generate JWT tokens for WebRTC client authentication
- Token refresh logic

---

## Verification Plan

### Automated Tests

1. **CSV Parser Tests** — `server/src/__tests__/csv-parser.test.ts`
   - Run: `cd server && npm test`
   - Tests: valid CSV, missing columns, duplicates, empty rows, different delimiters

2. **API Route Tests** — `server/src/__tests__/routes.test.ts`
   - Run: `cd server && npm test`
   - Tests: CRUD for leads, campaigns, call logs; auth middleware; error handling

### Browser Testing (Manual by Moazzam)

1. **Upload CSV**: Drop a CSV file → verify column mapper shows → confirm import → check leads appear in list view
2. **Card Stack**: Navigate to campaign dial view → verify cards render with lead data → swipe left (skip) → swipe right (should initiate call)
3. **Make a Call**: Click Call on a lead card → verify Telnyx WebRTC connects → speak into mic → verify you hear audio → hang up → verify disposition panel appears
4. **Disposition Flow**: After call, tap "Hot Lead" → verify lead status updates → verify next card appears
5. **Keyboard Shortcuts**: Press Space (call), → (skip), ← (back) → verify each works
6. **Responsive**: Resize browser to tablet width → verify cards and controls adapt

### Integration Test (Real Call)

1. Create a test campaign with 3 leads (use your own phone numbers)
2. Dial from browser → verify call connects on your phone
3. Test audio quality (both directions)
4. Test mute/unmute
5. Test DTMF tones
6. Complete all 3 calls → verify call logs in InsForge
