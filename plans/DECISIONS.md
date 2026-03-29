# Jazz Caller — Requirements & Decisions

> All decisions made during brainstorming, captured for reference during development.

---

## Product Vision

- **What**: Multi-tenant SaaS power dialer with dating-app card UX
- **Who**: Cold callers (India → USA B2B), each with their own Telnyx account
- **V1 Model**: Every user gets a personal instance with full access. No team/roles in V1.
- **Future**: Team Spaces plugin (V3+) — admins create team spaces, invite callers, centralized master campaigns

---

## Technical Decisions

| Decision | Choice | Notes |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | — |
| **Backend** | Node.js + Express + TypeScript | — |
| **Database/Auth/Storage** | InsForge (agent-native BaaS, PostgreSQL) | MCP installed, API key configured |
| **Telephony** | Telnyx WebRTC SDK (V1 only) | Multi-provider in V3+ |
| **Frontend Hosting** | Vercel (free tier) | — |
| **Backend Hosting** | Northflank (free sandbox tier) | Production-grade, BYOC for future |
| **Swipe Library** | `react-tinder-card` or Framer Motion | TBD during implementation |
| **UI Framework** | shadcn/ui (if feasible) | Dark/light mode toggle, dark default |
| **Domain** | User will assign a subdomain | Not our concern |

---

## Multi-Tenant Architecture

- Each user connects their OWN Telnyx account (API key + SIP Connection ID)
- Jazz Caller backend generates JWT tokens using the user's API key
- Calls are billed to the user's Telnyx account, not ours
- User's API keys stored encrypted in their profile
- Telnyx V1 only; Twilio/Plivo adapters planned for V3+

---

## UX Decisions

### Lead Card — Fields Shown (on card face, no "View More" needed)
1. Business Name
2. Contact/Owner Name
3. Phone Number
4. City + State
5. Google Rating + Review Count
6. Website
7. Business Category
8. Email
9. Tags (colored chips)

**"View More" expands to show**: Full address, notes, social links, hours, custom fields, call history

### Swipe Gestures
| Gesture | Action |
|---|---|
| Swipe Right | Call this lead |
| Swipe Left | Skip (next lead) |
| Swipe Up | Mark as Priority / Hot |
| Swipe Down | Reject / DNC |
| Tap Card | Expand full details |
| Long Press | Add note / edit |

### Keyboard Shortcuts (Desktop)
- `Space` = Call
- `→` = Skip
- `←` = Go back
- `↑` = Mark hot
- `↓` = Reject/DNC
- `Esc` = Pause campaign
- `N` = Add note

### Post-Call Dispositions (6 grouped buttons)

**Primary row (big):**
| Button | Covers |
|---|---|
| 🔥 Interested | Hot lead |
| 🤝 Follow-up | Callback + warm (with optional date picker) |
| ❄️ Not Interested | Said no |

**Secondary row (smaller):**
| Button | Covers |
|---|---|
| 📵 No Answer | No answer + Busy + Voicemail (sub-selector) |
| ❌ Wrong Number | Wrong person/business |
| 🚫 DNC | Remove permanently |

---

## CSV & Lead Data

- Rich CSVs from Map Miner scraper (business name, phone, owner, address, city, state, zip, website, Google rating, reviews, email, category, hours, socials)
- CSVs may be **messy/unorganized** — need robust column auto-detection + manual mapping
- Deduplication by phone number on import
- Handle various delimiters (comma, tab, semicolon)

---

## Design System

### Inspiration Apps
- **Beside** — Dark mode call UI, blue orb glow, clean minimal
- **Tinder** — Card swipe UX, bottom circular action buttons, tag chips
- **Wise.com** — Emerald green brand, trustworthy, financial
- **Higgsfield** — Green accent, modern AI product
- **Saily** — Soft light mode, rounded cards, clean spacing

### Color Palette
| Token | Dark Mode | Light Mode |
|---|---|---|
| Background | `#0F0F11` | `#F8F9FB` |
| Surface/Card | `#1A1A1E` (with frosted glass) | `#FFFFFF` |
| Border | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |
| Text Primary | `#FFFFFF` | `#0F0F11` |
| Text Secondary | `#9CA3AF` | `#6B7280` |
| Accent Primary | `#10B981` (Emerald 500) | `#059669` (Emerald 600) |
| Accent Gradient | `#10B981 → #34D399` | `#059669 → #10B981` |
| Danger/Red | `#EF4444` | `#DC2626` |
| Warning/Amber | `#F59E0B` | `#D97706` |

### Typography
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif;
```
- Headings: **600-700 weight**, large (24-32px)
- Body: **400 weight**, 14-16px
- Captions/Labels: **500 weight**, 12-13px, uppercase tracking for labels

### Component Style Guide
| Element | Style |
|---|---|
| Cards | `border-radius: 16-20px`, frosted glass (`backdrop-filter: blur(16px)`), subtle border |
| Buttons (primary) | Pill-shaped (`border-radius: 9999px`), emerald green fill, white text |
| Buttons (secondary) | Ghost outline, rounded pill, subtle hover fill |
| Action buttons | Circular (56px), icon center, Tinder-style bottom row |
| Tags/Chips | Small pills, colored background, rounded |
| Inputs | Rounded 12px, dark surface fill, subtle border on focus |
| Bottom nav | 4-5 items, icon + label, subtle active indicator |
| Transitions | 150-300ms ease, spring physics on card gestures |

### Dark/Light Mode
- **Dark as default** with toggle switch
- Both modes must look premium — reference Beside (dark) and Saily (light)

### Visual Effects
- Glassmorphism on cards and modals
- Subtle emerald glow on active/connected states
- Spring physics on swipe gestures (natural deceleration)
- Micro-animations on disposition buttons (scale + color pulse)
- Audio waveform visualization during active calls

---

## Session & Workflow

- Moazzam: Short bursts (30-50 calls, 1-2 hours)
- Team members: May do longer sessions (100-200+ calls)
- Design for flexible sessions with stats counter
- Break reminders as optional feature (V2)

---

## Telnyx Setup Status

- **Freemium account** — phone number only (+1-407-987-6902)
- Voice API Application NOT configured yet
- SIP Connection NOT created yet
- Need to complete Telnyx setup before first call

---

## Version Scope Summary

### V1 — "First Call" (MVP)
- Personal instances (no team features)
- Preview dialer with dating-app card UX
- Telnyx WebRTC only (user connects own account)
- CSV upload with column mapping
- Lead card stack with swipe gestures
- Browser-based calling (speak + hear)
- Post-call dispositions
- Mini-CRM (leads, campaigns, call logs)
- Basic stats (calls made, connected, avg duration)
- Dark/light mode

### V2 — "Machine"
- Power dialer mode (auto-dial)
- Call recording + transcription
- Analytics dashboard
- Script/cheat sheet panel
- Callback scheduling
- Calling hours enforcement

### V3 — "Switchboard"
- Team Spaces (plugin architecture, sellable add-on)
- Multi-provider (Twilio, Plivo adapters)
- Master campaigns + lead assignment
- CRM integration (HubSpot, Airtable, custom CRM)
- Local presence dialing
- Jazz Caller REST API

### V4 — "Enterprise"
- Predictive dialer + AMD
- TCPA/DNC compliance
- Mobile app (React Native)
- AI call summaries
- SMS/email follow-up automation
