# Workflow Application: Architecture, Feature & Failure-Mode Specification

**Document Version:** 3.1 (Production Architecture & Ergonomics)  
**Target Persona:** Service Manager / Dispatcher (Non-Technical Business Owner)  
**UX Architecture:** Unified Overlay & Progressive Disclosure Framework  

---

## 1. Global Architectural Rules

### 1.1 Overlay Stacking & Mobile Behavior Rule (Applied Everywhere)
- **Desktop View (≥1024px):**
  - Side drawers (`JobDetailsDrawer`, `CreateJobDrawer`) slide in from the right edge at a fixed width of `480px` (`max-w-[90vw]`) with a soft semi-transparent backdrop (`bg-black/30 backdrop-blur-xs`, `z-40`).
  - If a modal is triggered from within a drawer (e.g. `QuickAssignModal` or confirmation dialogs), it stacks centered on top with `z-50` over the `z-40` drawer backdrop.
  - Clicking the backdrop or pressing `Escape` closes the topmost overlay level only.
- **Mobile View (<1024px):**
  - Drawers transition to full-screen sheets (`w-full h-full fixed inset-0 z-50 bg-background`).
  - Every mobile overlay features a sticky top navigation bar containing a prominent **Back / Close (✕)** button and body scroll lock (`overflow-hidden`).

### 1.2 Unified Assignment Pattern
- Both **Quick Assign** (from the dashboard/queue table) and **Assign-from-drawer** share the exact same underlying service method (`assignmentRecommendationService.decideAssignmentRecommendation`) and argument signature:
  ```typescript
  {
    decision: 'accepted' | 'overridden',
    overrideReason?: AssignmentOverrideReason,
    overrideNote?: string, // Omitted / undefined when empty (never empty string)
    recommendationId: string,
    selectedEmployeeId: string
  }
  ```
- Expander state (`showWhyMatch`) resets to `false` automatically whenever a drawer or modal opens, preventing stale reasoning leaks across job inspections.

---

## 2. Operations Dashboard (`/`)

### 📋 What it Shows:
1. **Header & Operational Context:** Business greeting, current date, and quick action **+ New Job** button.
2. **Top Operational Metric Cards:** `Needs Assignment`, `Active Field Work`, and `Completed Today`.
3. **Action Needed Attention Feed:** Urgency alerts (Overdue service calls, unassigned urgent jobs).
4. **Pending Assignments Feed:** Open job queue awaiting dispatch.
5. **AI Operations Intelligence Command Panel:** Natural language queries (*"Find unassigned urgent jobs"*).
6. **Technician Workload Snapshot:** Real-time job distribution across active staff.

---

## 3. Jobs Queue Workspace (`/jobs`)

### 📋 What it Shows:
1. **Unified Filter Header:**
   - Single-line search bar (matches job title, customer name, phone, address).
   - Quick segment tabs (`All Jobs`, `Needs Assignment`, `Active`, `Completed`).
   - Secondary **Filters** popover for Priority, Assignment Status, and Creator.
2. **Jobs Data Table / Cards:**
   - Title, Priority Badge (`Urgent`, `High`, `Medium`, `Low`), Customer Name & Location.
   - Resolved Assigned Technician Name (e.g., `Assigned to: Rahul Sharma`).
   - Status Badge (`Open`, `Assigned`, `In Progress`, `Completed`).
   - Quick action buttons (View Details, Quick Assign, Reassign).

---

## 4. Overlay Drawer 1: Job Details & AI Recommendation (`JobDetailsDrawer`)

### 📋 Information Hierarchy & Hero Card Architecture:
To prevent cognitive overload, the AI Hero Card strictly separates **the recommendation action** from **the explainability details** via progressive disclosure:

1. **Default Hero Card View (Up Front):**
   - **Confidence Badge:** `High Match Confidence` or `Medium Match Confidence` (Emerald) vs `Low Match Confidence` (Amber).
   - **Technician Name:** Prominent display (e.g., **Rahul Sharma**).
   - **One-Line Plain-English Summary:** Leading business rationale (e.g., *"Matches required trade skills (AC Repair) and is available immediately."*).
   - **Primary Action:** **`⚡ Assign Rahul Sharma`** (1 Click).
   - **Secondary Action:** **`Choose Other`** (toggles structured override dropdown).

2. **Progressive Disclosure Expander (`Why this recommendation?`):**
   - Collapsed by default.
   - Clicking **`Why this recommendation? ▾`** expands a detailed panel displaying:
     - Calculated numeric match score (e.g. `88% Match Score`).
     - Breakdown bullets (Skill fit, schedule availability, proximity, current workload balance).

3. **Explicit Candidate Match States:**
   - **Zero Candidates Available State:** When zero technicians satisfy basic trade or schedule criteria, displays a **⚠️ No Available Technician Found** card with action **`Select Technician Manually`**.
   - **Low-Confidence Candidate State:** When top candidate total score is below 40%, displays an Amber warning pill with summary *"Low calculated match score (35%). Review trade skills or select an alternative worker."*

4. **Structured Override Selection:**
   - **Fixed-Choice Reason (Required):** `<select>` dropdown (`Better local availability`, `Customer requested this employee`, `Special experience required`, `Workload balancing`, `Recommended employee unavailable`, `Manager preference`, `Other`).
   - **Optional Audit Note:** Freeform text input (*"Optional notes for audit log..."*). Omitted as `undefined` when blank to keep database clean.

---

## 5. Overlay Drawer 2: Job Creation & WhatsApp AI Importer (`CreateJobDrawer`)

### 📋 What it Shows:
1. **AI Customer Request Importer:** Raw text input box allowing managers to paste WhatsApp messages, SMS, or emails.
2. **1-Click Auto-Fill:** `✨ Auto-Fill Form with AI` button.
3. **Structured Form Fields:** Job Title, Customer Name, Phone, Service Address, Priority, Required Trade Skills, Due Date, Description.

---

## 6. Team Roster Workspace (`/team`)

### 📋 What it Shows:
1. **Roster Header:** Assignable staff count, Export CSV action, live search & trade skill filters.
2. **Technician Roster Cards:**
   - Name, Role, Live Workload count (`0 Active`, `2 Active`).
   - Live Availability Dot (🟢 `Available`, 🔵 `Busy`, 🟡 `On Leave`).
   - Skill pills (capped at top 2 + overflow badge `+N more`).
   - **Schedule** button (opens `CreateJobDrawer` pre-configured for technician).
   - **⋮ Options Menu** (`⚡ Assign / Schedule Job`, `📋 Copy Profile Info`).

---

## 7. Reports & Intelligence Workspace (`/analytics`)

### 📋 Role-Gated Information Hierarchy:
- **Default View (All Managers & Dispatchers):** **Manager Operational KPIs**
  - AI Match Acceptance %, SLA Compliance %, Dispatch Speed, Active Workload Distribution.
- **Admin-Gated View (`canViewAcademicBenchmarks` / `role === 'admin'`):** **Academic Research Benchmarks**
  - Enforced at both UI and service authorization levels. Non-admin users are automatically redirected to Operational KPIs.

---

## 8. Operational Failure-Mode & Recovery Matrix

When network disruptions, permission errors, or race conditions occur, the system handles errors gracefully with explicit user guidance and fallback paths:

| Component / Scenario | Failure Trigger (What Breaks) | Error State Displayed (What User Sees) | Self-Correction / Recovery Action |
|---|---|---|---|
| **AI Match Engine Timeout** | External AI model delay or service timeout during scoring | Inline notification: *"AI match service timed out. Defaulting to available employee list."* | Automatic fallback loads active staff list sorted by availability; manager selects manually |
| **Network Disruption During Dispatch** | Internet connection drop while confirming job assignment | Red toast alert: *"Unable to record assignment. Please check connection."* | Firestore transaction rolls back cleanly; job remains open in queue; manager retries when online |
| **Concurrent Reassignment Race** | Two dispatchers assign or update the same job simultaneously | Alert banner: *"This job was modified by another manager. Loading latest details..."* | Firestore atomic transaction rejects stale write; drawer refreshes with updated assigned worker |
| **Fragmented Customer Text Import** | Pasted WhatsApp message lacks customer name or address | Amber banner: *"Partial request imported. Please verify highlighted customer details."* | AI populates available fields; missing required inputs are highlighted in red for 1-click manual completion |
| **Mobile App Offline Sync Lag** | Assigned field technician enters an offline dead zone | Status badge shows last sync timestamp: *"Assigned (Updated 15m ago)"* | System maintains offline snapshot; auto-updates status as soon as mobile app reconnects to cellular data |
| **Browser Download Restriction** | Browser blocks popup/download during Roster CSV export | Toast notification: *"CSV download blocked by browser permissions."* | Manager clicks browser address bar icon to grant download permission for domain |

---

## 9. Conclusion

This architecture specification guarantees zero structural divergence, resilient failure handling, and role-secured access across the entire Workflow platform.
