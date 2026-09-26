# Workflow Design System

**Status:** Approved design asset
**Location:** `docs/design-assets/design-system.md`
**Applies to:** `apps/web-app` (Manager/Admin portal) and `apps/mobile-app` (Employee field app)
**Supersedes:** Section 8 "Current UI Principles" of the root project memory, and the mobile "Carbon & Zinc" palette note in Section 4. Everything else in project memory — architecture, Firestore, RBAC, service layer, assignment engine boundaries — is unchanged and still binding.

---

## 1. Why this document exists

The two applications were built separately and drifted. Today they share no palette, no type scale, no badge language, and no action hierarchy. The web portal shows three identical blue primary buttons on one screen; the mobile app shows three identical green primary buttons in one list. In both cases the user has no way to tell what matters, because everything is shouting at the same volume.

This document defines one visual system for both apps. It is a specification, not a suggestion. Where it conflicts with existing component code, this document wins.

**The single governing idea:** *colour is reserved for exceptions.* A neutral interface where only the overdue job is red lets the eye do triage for free. An interface where every card has a coloured badge forces the user to read all of them.

---

## 2. Design position

Workflow is an operations instrument, not a marketing surface. The audience is a dispatcher at a desk with 25 open jobs, and a technician standing on a driveway in sunlight, possibly wearing gloves. Both are reading under time pressure.

The visual grammar comes from two grounded sources:

1. **Apple's iOS system palette and inset-grouped lists** — because the field app is an iOS-first tool and native convention beats novelty when a technician is one-handed.
2. **ANSI Z535 safety colours** — the colour language already painted on the equipment these technicians service. Signal blue for action, safety red for danger, green for all-clear. This grounds the palette in the subject matter instead of reaching for the default SaaS blue.

Everything else is neutral, hairline-separated, and quiet.

---

## 3. Colour

One accent across both applications. The mobile app's current Refined Emerald accent is retired as an *interactive* colour because green is semantically loaded — it means "completed" in the web portal, and using it for buttons made the mobile app's "Complete Job" and "Completed" states indistinguishable.

### Core neutrals

| Token | Hex | Use |
|---|---|---|
| `ink` | `#000000` | Titles, primary values, list row titles |
| `ink-2` | `#3C3C43` | Body text, secondary lines, form labels |
| `ink-3` | `#8E8E93` | Metadata, timestamps, placeholders, disabled |
| `separator` | `#C6C6C8` | 1px hairlines between rows |
| `border` | `#E3E3E7` | Card and control outlines |
| `surface` | `#FFFFFF` | Cards, sheets, table bodies |
| `surface-sunken` | `#F2F2F7` | Page background behind cards |
| `surface-raised` | `#FAFAFC` | Table headers, segmented control tracks |

Do not substitute tinted near-blacks (`#0B0B0B`, `#18181B`, `#111827`). Pure black is correct here; the tinted variants read as a generated default and fight the neutral ramp.

### Semantic

| Token | Hex | Use — and only this use |
|---|---|---|
| `accent` | `#005EB8` | Every interactive element: primary buttons, links, active tab, focus ring, selected state |
| `accent-press` | `#004A94` | Pressed / active state of the above |
| `accent-wash` | `#EAF2FA` | Selected row background, accent-tinted chip background |
| `danger` | `#C8102E` | Overdue, destructive actions, blocker alerts |
| `danger-wash` | `#FCEBEE` | Blocker banner background |
| `warn` | `#B45309` | At-risk only (due within 24h, low-confidence recommendation) |
| `done` | `#157F3D` | The completed state. Never a button. |

### Rules

- **One accent.** If an element is not interactive, it is not `accent`.
- **Status badges are neutral by default.** `ink-2` text on `surface-sunken`. A badge only takes colour when the status is exceptional: overdue → `danger`, completed → `done`. Assigned, In Progress, Open, Draft are all neutral.
- **Priority is not a chip.** Low and Medium priority render as plain `ink-3` text or are omitted entirely. High renders as `warn` text. Urgent renders as a `danger` dot before the row title. A screen where every job is badged `LOW PRIORITY` in a box is a screen with no signal.
- **Never use colour as the only carrier of meaning.** Every coloured dot pairs with text or an accessible label.

---

## 4. Typography

### Families

- **Mobile:** system default (SF Pro on iOS, Roboto on Android). Native metrics, native Dynamic Type support, zero bundle cost, correct optical sizing at small sizes. Do not ship a custom face to the field app.
- **Web:** Inter, with `font-feature-settings: "cv05" 1, "ss03" 1, "tnum" 1`. `cv05`/`ss03` give a slightly narrower, more mechanical cut than stock Inter; `tnum` gives tabular numerals so figures in tables and metric cards align in a column and don't jitter on live Firestore updates.

Apply `tnum` to every numeric value in both apps — metric cards, table cells, counts, times. Numbers that shift width when data refreshes look broken.

### Scale

Mobile (pt):

| Role | Size | Weight | Line |
|---|---|---|---|
| Screen title | 28 | 600 | 34 |
| Section title | 20 | 600 | 25 |
| Row title | 17 | 600 | 22 |
| Body | 15 | 400 | 20 |
| Secondary | 15 | 400 | 20 |
| Meta | 13 | 400 | 18 |
| Control label | 13 | 500 | 18 |

Web (px):

| Role | Size | Weight | Line |
|---|---|---|---|
| Page title | 24 | 600 | 30 |
| Section title | 17 | 600 | 24 |
| Body / table cell | 15 | 400 | 22 |
| Table header | 13 | 500 | 18 |
| Label | 13 | 500 | 18 |
| Meta | 12 | 400 | 16 |

Weight 700 is not in the system. Semibold is the heaviest weight in both apps; bold reads as shouting next to a hairline-based layout.

### Case

**Sentence case everywhere. No all-caps labels.** The current builds use at least six different caps treatments (`LOW PRIORITY`, `TOTAL COMPLETED`, `CURRENT`, `COMPLETED`, `OPEN JOBS`, `ASSIGNED FIELD TECHNICIAN`). All of them become sentence case at 13px `ink-3`. Caps micro-labels are the fastest way to make an operations tool look like a template.

### Punctuation

The middle-dot separator (`Dev Patel · 44 Hilltop Terrace`) is permitted in **exactly one place**: the secondary line of a mobile list row, where it is native convention. It is not permitted anywhere in the web portal, and not in mobile headers, cards, or detail screens. No arrow glyphs appended to button or link text.

---

## 5. Space, shape, elevation

- **Grid:** 4pt. Permitted steps: 4, 8, 12, 16, 20, 24, 32, 48.
- **Radius:** 10 controls (buttons, inputs, chips) · 14 cards · 20 sheets and modals · 999 dots and segmented thumbs. One radius per element class; do not apply the card radius to everything.
- **Elevation:** one level per platform.
  - Mobile: **no shadows.** Separation comes from `surface` cards on a `surface-sunken` page, iOS inset-grouped style.
  - Web: `0 1px 2px rgba(0,0,0,0.04)` on cards and drawers only. Nothing else casts a shadow. Delete every other `shadow-*` utility.
- **Hairlines:** 1px `separator` between list rows and table rows. Inset the hairline to the content's left edge (past the leading icon/avatar), not full-bleed.
- **Minimum hit target:** 44×44pt mobile, 36×36px web.

---

## 6. Motion

| Interaction | Duration | Curve |
|---|---|---|
| Web drawer open/close | 220ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Web fade / state change | 150ms | `ease-out` |
| Mobile sheet | spring, damping 0.82, stiffness 240 | — |
| Press feedback | 100ms | `ease-out`, opacity 0.6 |

No entrance animation on cards, rows, or metrics. No hover-lift, no scale-in, no shimmer longer than 400ms. Motion answers a user action; it never announces content arriving. Respect `prefers-reduced-motion` on web and `isReduceMotionEnabled` on mobile by cutting to the end state.

Because the mobile repository already caches with a 60s TTL and applies optimistic updates, most navigations should render instantly with **no loading state at all**. That silence is the quality signal — skeletons are a fallback for cold reads only.

---

## 7. Token implementation

Tokens live in exactly two files. **No hex value may appear in a component file in either app.** This is the rule that keeps the two apps looking like one product after the next six phases.

### `apps/web-app/src/styles/tokens.css`

```css
:root {
  /* neutrals */
  --wf-ink: #000000;
  --wf-ink-2: #3C3C43;
  --wf-ink-3: #8E8E93;
  --wf-separator: #C6C6C8;
  --wf-border: #E3E3E7;
  --wf-surface: #FFFFFF;
  --wf-surface-sunken: #F2F2F7;
  --wf-surface-raised: #FAFAFC;

  /* semantic */
  --wf-accent: #005EB8;
  --wf-accent-press: #004A94;
  --wf-accent-wash: #EAF2FA;
  --wf-danger: #C8102E;
  --wf-danger-wash: #FCEBEE;
  --wf-warn: #B45309;
  --wf-done: #157F3D;

  /* shape */
  --wf-r-control: 10px;
  --wf-r-card: 14px;
  --wf-r-sheet: 20px;
  --wf-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04);

  /* motion */
  --wf-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
}

html {
  font-feature-settings: "cv05" 1, "ss03" 1, "tnum" 1;
}
```

Extend `tailwind.config.ts` to expose these as `colors.wf.*`, `borderRadius.*`, and `boxShadow.card` so components use `bg-wf-surface`, `text-wf-ink-2`, `rounded-card`. Do not add a Tailwind plugin or any new dependency to do this — the `theme.extend` object is sufficient.

### `apps/mobile-app/src/theme/theme.ts`

```ts
export const color = {
  ink: '#000000',
  ink2: '#3C3C43',
  ink3: '#8E8E93',
  separator: '#C6C6C8',
  border: '#E3E3E7',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F2F7',
  surfaceRaised: '#FAFAFC',
  accent: '#005EB8',
  accentPress: '#004A94',
  accentWash: '#EAF2FA',
  danger: '#C8102E',
  dangerWash: '#FCEBEE',
  warn: '#B45309',
  done: '#157F3D',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { control: 10, card: 14, sheet: 20, pill: 999 } as const;

export const type = {
  screenTitle: { fontSize: 28, fontWeight: '600', lineHeight: 34 },
  sectionTitle: { fontSize: 20, fontWeight: '600', lineHeight: 25 },
  rowTitle:     { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body:         { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  meta:         { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label:        { fontSize: 13, fontWeight: '500', lineHeight: 18 },
} as const;
```

---

## 8. Mobile field app

### 8.1 Job list — replace the card with a list row

The current card is ~230pt tall, so 2.5 jobs fit on a 6.7" screen, and each card carries its own full-width saturated green button. Three equal primary buttons means three equal emergencies.

Target row height **88–96pt**, five jobs visible.

```
┌────────────────────────────────────────────┐
│  Ductless AC installation               ›  │  17/600 ink
│  Dev Patel · 44 Hilltop Terrace            │  15/400 ink-2
│  ● In progress                  Due today  │  13/400, dot = status
└────────────────────────────────────────────┘
   ── hairline, inset 16pt ──
```

- Whole row is the tap target; it opens Job Details.
- No button in the row. "Complete job" lives on the detail screen, where it is the one obvious action.
- If completion from the list is wanted, use a trailing **swipe action** (iOS Mail pattern), not a persistent button.
- Urgent jobs get a `danger` dot before the title. Low priority renders nothing at all.

### 8.2 Filters

Replace the pill group with a true iOS segmented control: `surface-raised` track, white thumb, `radius.pill`, `ink` label on the selected segment, `ink-2` on the rest. No black fill.

### 8.3 Job details

One primary action. Current screen has four buttons for two actions.

```
‹  Job details

┌──────────────────────────────────────┐
│ Ductless AC installation             │   20/600
│ In progress                          │   13/400 ink-3
│                                      │
│ Install new ductless system and      │   15/400 ink-2
│ complete basic handover checks.      │
└──────────────────────────────────────┘

Customer
┌──────────────────────────────────────┐
│ Dev Patel                            │
│ 555-0120                     [call]  │   icon buttons, accent
│ 44 Hilltop Terrace            [map]  │
└──────────────────────────────────────┘

Required skills
  Installation   Ductless systems          neutral chips

┌──────────────────────────────────────┐
│           Complete job                │   filled accent, 50pt
└──────────────────────────────────────┘
        Report a blocker                    text button, ink-2
```

Remove the duplicated "Call customer" / "Directions" pair at the top of the screen.

### 8.4 History

- Delete the two-number stat strip. Replace with one inline line under the title: `2 completed · none today`, 13/400 `ink-3`.
- `Completed` badge uses the same neutral-or-semantic rule as everywhere else: `done` text on `surface-sunken`. Not a green outline pill. There is exactly one badge component in the app.
- The list starts immediately below the title so the screen doesn't open on 60% empty space.

### 8.5 Profile

- Remove the wrench and shield emoji. Section heading is `Skills`.
- Remove the Active/Completed stat card — it duplicates History.
- Sign out appears **once**, as a `danger`-text row at the bottom of the grouped list. Remove the ghost "Sign out" from the Jobs header, which is currently clipped under the floating gear anyway.

### 8.6 Tab bar

One icon family, outline at rest, filled when active, `accent` when active and `ink-3` at rest. Currently Jobs is a filled briefcase, History is a circled check, and Profile is a filled person — three different treatments.

### 8.7 Defects to fix while in these files

- **The floating blue gear** overlaps content on all four screens, including the job description card. If it is the Expo dev menu, exclude it from design review. If it is app UI, move it into the header.
- **Crossed skill mapping:** the "Ductless AC installation" detail screen lists required skills as *Circuit Boards* and *Electronics Repair*, which belong to the refrigerator job. Check the seed data and the capability mapping in `organizationConfigurations` before assuming this is a render bug.

---

## 9. Web management portal

### 9.1 Action hierarchy — one primary per view

The dashboard currently renders three primary blue buttons that do the same thing (header "Create Job", page "New Job", sidebar "Create Job").

- Keep **one**: the header `Create job`.
- Delete the page-level `New Job` button.
- Demote the sidebar entry to a quiet row with a `+` leading icon, `ink-2` text, no fill.

### 9.2 Page header

Replace `Welcome back, Manager` / 34px with the page name at 24/600 and the date at 13/400 `ink-3`. Greetings are marketing copy in a dispatch tool.

### 9.3 Metric cards

- All four values render at 28/600 `ink`, tabular numerals.
- Label above the value, 13/400 `ink-3`, sentence case.
- Remove the coloured icon chips.
- Exactly one exception: `Needs attention` renders its value in `danger` **only when greater than zero**. At zero it is neutral and the card is quiet.

### 9.4 Needs attention list

Two defects: the action per row is inconsistent (three "Open Job", one "Quick Assign", no inferable rule), and overdue severity is not encoded — a job 80 days late looks identical to one 65 days late.

- Action is derived from state, with no exceptions: unassigned → `Assign`, everything else → `Open`.
- Severity text replaces the flat `Overdue` label: `80 days overdue` in `danger`, `3 days overdue` in `warn`, `Due in 2 days` in `ink-3`.
- Row layout: title (15/500) · state line (13/400) · trailing action button.

### 9.5 Jobs table

- Row height **56px**, whole row clickable, hairline separators, no zebra striping.
- `Priority` becomes a 8px dot with an accessible label — Urgent `danger`, High `warn`, Medium/Low `ink-3`. `Status` is the only chipped column, and the chip follows the neutral-by-default rule.
- Collapse the `Main action` column into one icon button plus an overflow menu. Do not render three differently coloured text links in one cell.
- Add a visible result count and pagination. 25 rows with 10 visible and no pager is a dead end.
- The filter strip has three competing mechanisms (search, quick tabs, Filters dropdown). Keep the search field and the quick tabs; fold everything in the dropdown that duplicates a tab into the tabs, and leave the dropdown for genuinely secondary facets only.

### 9.6 Team page

- Replace the stacked caps blocks (`CURRENT` / `2 Active` / `COMPLETED` / `1 Completed` — four elements for two integers) with one line: `2 active · 1 completed` at 13/400 `ink-2`. *(Exception to the middle-dot rule is not granted here — use `2 active, 1 completed`.)*
- Availability becomes a 8px dot before the name plus a text label, not a badge.
- Row height 56px, one trailing action (`Schedule`) plus overflow.

### 9.7 Settings

- Collapse the five tabs to those with real content. A tab containing two toggles on an 85%-empty page is not a tab.
- **Delete the footer line** "Settings changes are saved directly to your organization configuration document in Cloud Firestore (`organizationConfigurations`)." Users manage notifications; they do not manage Firestore documents. Implementation detail never appears in a product surface.

### 9.8 Job details drawer

This is the manager's decision screen and currently the least professional surface in the product: it contains an emoji (⏳), a paragraph of documentation about the state machine, and monospaced code formatting for `Assigned ➔ In Progress ➔ Completed`.

Rebuilt order — decision first, explanation last or not at all:

```
Washing machine inverter fault                              ✕
Casey Bennett · 15 Lakeside Plaza          ← no dot on web: use two lines

┌───────────────────────────────────────────────────────┐
│ Assigned field technician                             │
│ Ethan Kim                          [ Reassign ]       │
│ Waiting for the technician to start work.             │   ink-2, no emoji
└───────────────────────────────────────────────────────┘

Urgent · Assigned                                          ← status row, dot + text

Job information
  Phone            555-0116
  Address          15 Lakeside Plaza
  Description      Motor controller fault suspected after
                   intermittent spin failure.
  Required skills  Installation   Ductless systems

Activity (2)                                        [expand]   collapsed by default
```

- Delete the "Field work progression" block entirely. If managers genuinely need that explanation, attach it to a small ⓘ affordance on the status chip.
- Remove the monospace face. No data label in this product uses monospace.
- If an active blocker exists, a `danger-wash` banner with a `Mark resolved` action sits directly under the title — above everything else, because it's the only thing that changes what the manager should do next.

---

## 10. Copy rules

- Sentence case for every label, button, heading, and chip. No Title Case, no caps.
- A button names its outcome, and the outcome keeps the name: `Complete job` → toast `Job completed`. `Assign` → `Assigned to Ethan Kim`.
- Plain business English, already the project's direction: "Assign worker", "Reassign technician", "Smart match". Keep it.
- No implementation vocabulary in the UI: no collection names, no `organizationId`, no `rule-based-v1`, no state-machine arrows.
- Empty states state the situation and offer the action: "No jobs waiting for assignment." plus a `Create job` link — not a shrug.
- Errors say what happened and what to do, in the interface's voice, without apologising.
- Never describe the assignment engine as autonomous or as machine learning anywhere in the UI. It recommends; the manager decides. This is a hard project constraint, not a style preference.

---

## 11. Anti-pattern list

Nothing below ships:

1. More than one primary button visible in a viewport.
2. A coloured badge on a non-exceptional state.
3. All-caps labels.
4. Emoji in product UI.
5. Monospace for data labels.
6. Hex values inside component files.
7. Shadows on anything except a web card or drawer.
8. Entrance animation on lists, cards, or metrics.
9. Two components that render the same concept (two badge styles, two Sign out treatments, two Create Job buttons).
10. Duplicate actions within one screen.
11. Implementation detail in user-facing copy.
12. Tinted near-blacks standing in for black.
13. Decorative gradients.
14. Controls that look functional but have no behaviour.

---

## 12. Acceptance checklist

Per screen, before a phase is called done:

- [ ] Exactly one primary action visible.
- [ ] Every colour used traces to a token, and every non-neutral colour marks an exception.
- [ ] No component file contains a hex literal.
- [ ] All numeric values use tabular figures.
- [ ] Hit targets ≥ 44pt mobile / 36px web.
- [ ] Visible keyboard focus ring (`accent`, 2px, 2px offset) on every interactive element.
- [ ] Text contrast ≥ 4.5:1; UI component contrast ≥ 3:1.
- [ ] `prefers-reduced-motion` honoured.
- [ ] No double vertical scrollbars; shell owns document scroll; main content scrolls only.
- [ ] No horizontal scrolling except inside a deliberately scrollable table.
- [ ] No overlapping or clipped controls at 1280px, 1024px, 768px, and 390px.
- [ ] Existing routes, actions, Firestore reads/writes, and RBAC behave exactly as before.
- [ ] `npm run lint` and `npm run build` pass in `apps/web-app`.

---

## 13. Rollout phases

Ship in this order. Each phase is independently mergeable and independently verifiable.

| Phase | Scope | Touches |
|---|---|---|
| **D0** | Token files + Tailwind theme extension + `theme.ts`. No visual change to any screen yet. | `tokens.css`, `tailwind.config.ts`, `theme/theme.ts` |
| **D1** | Primitives: `Button`, `StatusBadge`, `PriorityBadge`, `Chip`, `Card`, `DataTable` row, `MetricCard`, `EmptyState`, `SegmentedControl`. Migrate to tokens; collapse duplicate badge styles into one. | `components/`, mobile `components/` |
| **D2** | Web action hierarchy: remove duplicate primaries, rebuild page headers, metric cards, needs-attention rows. | `Dashboard`, `PageHeader`, `Sidebar`, `Header` |
| **D3** | Web density: Jobs table, Team rows, filter strip, pagination. | `JobsPage`, `TeamPage` |
| **D4** | `JobDetailsDrawer` rebuild + `SettingsPage` cleanup + copy pass. | drawer, settings, strings |
| **D5** | Mobile list-row rebuild, segmented control, tab bar icons. | `(tabs)/index`, `JobCard` |
| **D6** | Mobile detail screen, History, Profile; emoji and duplicate-action removal. | remaining mobile screens |

---

## 14. Explicitly out of scope for this design phase

No change to: Firestore schema, security rules, indexes, service-layer modules, RBAC, tenant isolation, the assignment engine or its scoring, AI drafting behaviour, route structure, or `package.json` dependencies. No new top-level collections. No dark mode in this phase — the token structure permits adding it later, but it is not approved work now.
