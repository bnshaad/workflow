---
name: Workflow Design System
colors:
  surface: '#FFFFFF'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#F9FAFB'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
  text-primary: '#111827'
  text-secondary: '#6B7280'
  success: '#10B981'
  warning: '#F59E0B'
  danger: '#EF4444'
  border: '#E5E7EB'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  section-header:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 240px
  max-content-width: 1440px
  container-padding: 2rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
---

# Workflow Design System
## Purpose
Defines the visual language of Workflow.
All UI implementations must follow this document.
---
# Design Philosophy
Workflow should feel like:
- Linear
- Notion
- Arc
- Vercel
- Stripe Dashboard
Characteristics:
- Premium
- Minimal
- Calm
- Professional
- Enterprise-ready
- Typography-first
Avoid:
- Generic admin templates
- Bootstrap appearance
- Material Design look
- Heavy gradients
- Glassmorphism
- Neon colors
- Excessive animations
---
# Layout
Desktop-first.
Persistent left sidebar.
Top navigation.
Large content area.
Maximum content width around 1440px.
---
# Navigation
Sidebar
- Dashboard
- Tasks
- Employees
- Settings
Top Bar
- Search
- Notifications
- Organization
- User Profile
---
# Color Direction
Theme:
Light only (MVP)
Background:
#F9FAFB (Neutral off-white)
Surface:
#FFFFFF (White)
Primary text:
#111827 (Dark charcoal)
Secondary text:
#6B7280 (Muted gray)
Accent:
#2563EB (Professional blue)
Success:
#10B981 (Green)
Warning:
#F59E0B (Amber)
Danger:
#EF4444 (Red)
Border:
#E5E7EB (Subtle gray)
---
# Typography
Font:
Inter, Geist, or SF Pro (Modern Grotesk)
Hierarchy:
Page Title: 24px-30px, Semi-bold
Section Heading: 18px, Medium
Body: 14px, Regular
Caption: 12px, Muted
Readable tables.
Large whitespace.
---
# Components
Core reusable components:
- Sidebar: Fixed width, minimal icons, clear active state.
- Header: Sticky, search integrated, user profile.
- Metric Card: Bordered, large value, subtle trend indicator.
- Data Table: Borderless rows, subtle hover effect, clean columns.
- Task Card: Priority indicator, status badge, assignee avatar.
- Recommendation Card: Signature component. Match score, bulleted reasons, clear Approve/Override actions.
- Status Badge: Muted background, dark text for readability.
- Search Input: Subtle background, clear icon.
- Filter Bar: Segmented controls or simple dropdowns.
- Modal: Centered, backdrop blur, clean dismissal.
---
# Recommendation Card
This is the signature component.
Must display:
- Employee name & avatar
- Match Score (%)
- Reason Breakdown (Skills, Availability, Workload, Location, Performance)
- Approve button (Primary)
- Override/Choose Different button (Secondary)
Reasons should always be visible.
No charts.
No AI buzzwords.
---
# Tables
Minimal.
Alternating row hover.
Sticky header.
Simple pagination.
No excessive borders.
---
# Icons
Lucide only.
---
# Animations
Minimal.
Fast transitions.
Purposeful only.
---
# Implementation
Preferred stack:
- Tailwind CSS
- shadcn/ui
- lucide-react