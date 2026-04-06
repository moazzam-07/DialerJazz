# Jazz Caller — Stitch Prompts for Iteration

> Copy-paste these into Stitch (stitch.withgoogle.com) to iterate on designs.
> Use **App** toggle + **Mobile** mode for best results.
> Project: https://stitch.withgoogle.com/projects/9879440586125450627

---

## Design System Prefix (add to ALL prompts)

```
Use the "Midnight Emerald" design system:
- Theme: Dark, premium, sleek — inspired by Wise.com and Beside app
- Background: Near Black (#0F0F11 / #131315)
- Surface/Card: Dark Gray (#1A1A1E / #2A2A2C) with glassmorphism
- Primary Accent: Emerald Green (#10B981 → #4EDEA3 gradient)
- Text Primary: White (#E5E1E4)
- Text Secondary: Cool Gray (#9CA3AF / #86948A)
- Danger: Red (#EF4444) 
- Buttons: Pill-shaped, fully rounded
- Cards: Rounded 20px, frosted glass effect
- Font: Inter, clean and modern
- No 1px borders — use tonal layering instead
- Shadows: Extra-diffused, ambient (not hard drop shadows)
```

---

## Screen 1: Lead Card Swipe (Main Dialer)

```
Premium sales dialer main screen with Tinder-style swipeable lead card.

Top bar: Campaign name "San Francisco Car Detailers" (left), session stats "12/150 leads • 0:42:15" (right), settings gear.

Center: Large glassmorphic lead card (20px rounded, frosted glass) with:
- "Precision Auto Detail" (large heading)
- "Michael Torres" (contact, person icon)
- "+1 (415) 555-0142" (phone icon)
- "San Francisco, CA" (pin icon)
- "4.8 ★ (127 reviews)" (gold stars)
- "precisionautodetail.com" (link)
- "Auto Detailing" emerald chip
- Tags: "Follow-up" (blue), "Premium" (gold)
- "mike@precisionauto.com" (mail icon)
- Swipe hints on edges: "< Skip" | "Call >"

Bottom action row: 5 Tinder-style circular buttons — Undo (yellow), Skip (red X), Star (blue), Call (LARGE emerald green phone), Next (gray arrow)

Bottom nav: Campaigns, Dialer (active green), Stats, Settings
```

---

## Screen 2: Active Call

```
Live call in progress screen for Jazz Caller.

Top: "Campaign: SF Car Detailers", "00:01:34" large emerald timer, "Connected" green pulsing badge

Center: Glassmorphic card with:
- "Precision Auto Detail" heading
- "Michael Torres" contact
- "+1 (415) 555-0142"
- Audio waveform bars in emerald green (animated)

Quick notes: Dark recessed input "Add call notes..."

Bottom controls: 4 large circular buttons — Mute (gray mic), Keypad (gray grid), Speaker (gray speaker), End Call (LARGE red phone-down)

No bottom nav — full focus mode during calls.
```

---

## Screen 3: Post-Call Disposition

```
After-call disposition screen for Jazz Caller.

Header: "Call Ended" with duration "2:34", contact "Precision Auto Detail — Michael Torres"

Primary dispositions (3 large pill buttons):
- "Interested" — emerald green fill
- "Follow-up" — blue fill (#3B82F6) with calendar icon
- "Not Interested" — gray fill

Secondary dispositions (3 smaller outline pills):
- "No Answer" — amber outline
- "Wrong Number" — orange outline
- "DNC" — red outline

Notes textarea: "Add notes about this call..." (3 lines, dark recessed)

Tags: "+ Add Tag" button, existing tags "Budget Concern", "Call Back PM"

Large "Save & Next Lead →" emerald green pill button at bottom.
Small "Skip" text link below.
```

---

## Screen 4: Dashboard / Home

```
Dashboard home screen for Jazz Caller — first screen after login.

Top: "Jazz Caller" logo (emerald) left, user avatar right, notification bell

Connection banner: Amber warning card "Connect your Telnyx account to start calling →" (or green "Connected" if set up)

Quick stats: 3 glassmorphic cards in a row:
- "Calls Today: 12" (phone icon)
- "Connected: 8" (green check)
- "Avg Duration: 1:34" (clock)

Campaigns section: "Your Campaigns" heading + "+ New" button

Campaign cards (vertical list):
- "SF Car Detailers" — progress bar 12/150 (8%), "Active" green badge
- "Miami Detailers" — progress bar 45/200 (22%), "Paused" amber badge
- "+ Create Campaign" dashed outline card

Bottom nav: Campaigns (active), Dialer, Stats, Settings
```

---

## Screen 5: Settings / Telnyx Setup

```
Settings screen for Jazz Caller — where users connect their Telnyx account.

Top: "Settings" heading with back arrow

Sections:

1. "Telephony Provider" section with Telnyx logo:
   - API Key input (masked with ●●●● + reveal toggle)
   - SIP Connection ID input
   - Phone Number input "+1 (407) 987-6902"
   - "Test Connection" emerald green pill button
   - Status: Green "Connected" or red "Not Connected" badge

2. "Appearance" section:
   - Dark/Light mode toggle switch
   - Theme preview (small)

3. "Account" section:
   - Email: "moazzam@example.com"
   - "Change Password" link
   - "Log Out" red text button

4. "About" section:
   - Version "1.0.0"
   - "Help & Support" link
```

---

## Screen 6: CSV Upload / New Campaign

```
CSV upload and campaign creation screen for Jazz Caller.

Top: "New Campaign" heading with close X button

Steps:
1. Campaign name input: "Campaign Name" with placeholder text
2. CSV Upload area: Large dashed-border dropzone "Drop CSV here or tap to browse", file icon in center, "Supports .csv and .xlsx" subtitle
3. After upload — Column mapping preview:
   - Table showing first 3 rows of data
   - Dropdowns above each column: "Business Name", "Phone", "Contact", "City", etc.
   - Auto-detected columns highlighted in emerald green
4. Lead count: "150 leads detected" with green checkmark
5. "Create Campaign" large emerald green pill button

Bottom: "Cancel" text link
```

---

## Screen 7: Login / Signup

```
Premium login screen for Jazz Caller.

Center: Large "Jazz Caller" logo with emerald green phone icon, "Your Premium Sales Dialer" tagline in gray

Login form card (glassmorphic):
- Email input with mail icon
- Password input with lock icon and eye toggle
- "Forgot Password?" link in emerald green
- "Sign In" large emerald green pill button (full width)

Divider: "or" with horizontal lines

Social login: "Continue with Google" ghost button

Bottom: "Don't have an account? Sign Up" link

Subtle emerald gradient glow behind logo area for premium feel.
```

---

## Tips for Iterating

1. **One screen at a time** — Stitch works best with focused prompts
2. **Be specific** about colors, sizes, and layout positions
3. **Reference the design system** at the top of each prompt
4. **Use "edit" prompts** for tweaks: "Make the Call button 20% larger" or "Add a subtle glow behind the lead card"
5. **Mobile first** — always use App toggle in Stitch
