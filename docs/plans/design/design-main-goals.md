# Design — Main Goals

> Visual identity and UX principles for DialerJazz.

---

## Design System: "Midnight Emerald"

### Inspiration
- **Beside** — Dark mode call UI, blue orb glow, clean minimal
- **Tinder** — Card UX, circular action buttons, tag chips
- **Wise.com** — Emerald green brand, trustworthy, financial
- **Higgsfield** — Green accent, modern AI product

### Color Palette

| Token | Dark Mode | Light Mode |
|---|---|---|
| Background | `#0F0F11` | `#F8F9FB` |
| Surface/Card | `#1A1A1E` (frosted glass) | `#FFFFFF` |
| Border | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |
| Text Primary | `#FFFFFF` | `#0F0F11` |
| Text Secondary | `#9CA3AF` | `#6B7280` |
| Accent Primary | `#10B981` (Emerald 500) | `#059669` (Emerald 600) |
| Accent Gradient | `#10B981 → #34D399` | `#059669 → #10B981` |
| Danger | `#EF4444` | `#DC2626` |
| Warning | `#F59E0B` | `#D97706` |

### Typography
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, system-ui, sans-serif;
```
- Headings: 600-700 weight, 24-32px
- Body: 400 weight, 14-16px
- Labels: 500 weight, 12-13px, uppercase tracking

### Component Styles
| Element | Style |
|---|---|
| Cards | `border-radius: 16-20px`, frosted glass, subtle border |
| Buttons (primary) | Pill-shaped, emerald green fill, white text |
| Buttons (secondary) | Ghost outline, rounded pill |
| Action buttons | Circular (56px), icon center |
| Tags/Chips | Small pills, colored background |
| Inputs | Rounded 12px, dark surface fill |
| Transitions | 150-300ms ease, spring physics on gestures |

### Visual Effects
- Glassmorphism on cards and modals
- Emerald glow on active/connected states
- Micro-animations on disposition buttons (scale + color pulse)
- Audio waveform visualization during active calls

---

## UX Principles

1. **Desktop-first** — Most calling happens on laptops. Mobile is secondary.
2. **Dark mode default** — Premium feel, reduces eye strain during long sessions.
3. **Minimal clicks** — Disposition → auto-advance to next lead in power mode.
4. **Always show call state** — Active call bubble persists across all pages.
5. **No modal hell** — Use overlays and inline expansions, not stacked modals.
