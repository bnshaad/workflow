# Workflow visual direction

## Decision

Use the existing [Workflow Design System](docs/design-assets/workflow_design_system/DESIGN.md) as the project’s authoritative design specification. This file records the selected direction: **calm, typography-led operational software with a contemporary editorial polish**.

Neuform is a useful aesthetic reference for restraint and clarity, but it is not a source of product or interaction requirements. This direction must not replace the approved Workflow screens, layout, terminology, information architecture, or component set.

## Reference assessment

Direct inspection of `neuform.io` was blocked by its Cloudflare challenge on 2026-07-17. The selection below therefore draws only on the intended high-level reference—minimal, modern product presentation—and on the implementation and approved assets already in this repository. Do not treat this as a page-by-page reconstruction of Neuform.

## Chosen qualities

- **Quiet hierarchy:** clear page titles, concise supporting copy, and dense but breathable operations content.
- **Editorial typography:** Geist or Inter, with strong weight and size contrast instead of decorative treatments.
- **Crisp surfaces:** off-white application background, white working surfaces, hairline borders, and restrained corner radii.
- **Purposeful blue:** professional blue is reserved for primary actions, active navigation, focus, and actionable links.
- **Operational clarity:** tables, status badges, recommendation reasons, and job decisions stay legible at a glance.
- **Subtle motion:** short feedback transitions only; no ambient animation, large reveals, glass effects, gradients, or neon.

## Required visual system

| Area | Decision |
| --- | --- |
| Layout | Desktop-first fixed left sidebar (240px), stable top bar, main-content scrolling, maximum content width 1440px. |
| Palette | `#F9FAFB` background, `#FFFFFF` surfaces, `#111827` primary text, `#6B7280` secondary text, `#2563EB` primary action, `#E5E7EB` borders. |
| Type | Page title 24–30px semibold; section title 18px medium; body 14px; captions 12px. |
| Shape | Compact radii: 2px–12px; default 6px. Prefer borders and spacing to shadows. |
| Spacing | 32px container padding, 24px gutters, 16px standard vertical stacks, 8px compact stacks. |
| Icons | Lucide only, used to clarify actions and navigation. |

## Application rules

1. Keep the approved Workflow shell and screen layouts intact; do not turn the operations portal into a marketing landing page.
2. Favor reusable primitives already in use: `Sidebar`, `Header`, `PageHeader`, `MetricCard`, `DataTable`, `StatusBadge`, `Timeline`, and `SuggestedWorkerCard`.
3. Keep the recommendation card explainable: score, visible reasons, and clear Approve/Override actions; no charts or AI embellishment.
4. Keep data-dense views calm: sticky table headers, subtle row hover, minimal borders, and visible page-level actions.
5. Preserve keyboard focus, accessible labels, and sufficient status contrast.

## Explicit exclusions

- No redesign of approved screens or information architecture.
- No new color theme, font family, visual framework, or dependency.
- No glassmorphism, gradients, neon palettes, oversized rounded cards, or decorative illustration systems.
- No fake controls or animation that obscures operational work.

## Implementation reference order

1. `docs/project-knowledge-base/`
2. `docs/design-assets/workflow_design_system/DESIGN.md`
3. Approved screen images in `docs/design-assets/screens/`
4. Existing shared components and `apps/web-app/src/index.css`
5. This file, for interpretation only
