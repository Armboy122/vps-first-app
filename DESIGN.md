# PeaTransformer Design Direction

## Status

- Confirmed by: Product owner
- Confirmed on: 2026-07-27
- Scope: Login, outage operations, request creation and editing, profile,
  administration, responsive navigation, tables, cards, forms, dialogs, and
  feedback states
- Inheritance strategy: Evolve

## Product and users

- Product: An operational system for tracking planned power outages, approvals,
  pending OMS work, transformer data, users, and business-calendar exceptions.
- Primary users: PEA operations staff who monitor work and update OMS status.
- Supporting users: Managers, supervisors, read-only viewers, and administrators.
- Core jobs: Find urgent work quickly, understand approval and OMS state, update
  records safely, create outage requests, and administer reference data.
- Highest-risk mistakes: Showing the wrong urgency, changing a status
  accidentally, exposing work outside a role's scope, or losing context during
  bulk work.
- Supported devices and languages: Thai-first; desktop is the primary dense-data
  surface and mobile supports field and follow-up work.

## Design DNA

- [User choice] Personality: Calm, clear, trustworthy, fast, and professional.
- [User choice] Desired first impression: A focused PEA operations tool, not a
  marketing dashboard.
- References: The current workflow, role model, outage table, and recognizable
  PeaTransformer structure.
- [User choice] Anti-references: Heavy glassmorphism, decorative gradients,
  oversized rounded cards, nested cards, marketing-style hero content, and
  excessive status color.

## Color

### Primary direction

- [User choice] Primary territory: Restrained deep green.
- [Derived] Primary: `#245D42`; hover `#1B4933`; pressed `#143827`;
  soft selected surface `#EAF3ED`; focus `#2F7554`.
- Role in the interface: Primary actions, active navigation, selected controls,
  links, and focus. Green is not used to decorate neutral content.

### Supporting system

- [Derived] Neutral foundation:
  - page `#F5F7F5`
  - frame `#EFF3F0`
  - surface `#FFFFFF`
  - subtle surface `#F7F9F7`
  - border `#DCE4DE`
  - strong border `#C8D3CB`
  - heading `#16211A`
  - body `#314139`
  - muted `#607067`
- [Derived] Semantic roles:
  - danger/error `#B42318` on `#FEF3F2`
  - warning/urgent `#8A4B08` on `#FFF7E8`
  - success `#267447` on `#ECF8F0`
  - information `#245F91` on `#EEF6FC`
- Contrast and usage rules:
  - White on primary and semantic solid actions must meet WCAG AA.
  - Status always includes text or an icon; color is never the only signal.
  - Amber and red are reserved for urgency, warnings, errors, and destructive
    actions.
  - Icons inherit text color unless they communicate status.

## Typography

- [User choice] Typographic character: Clean and neutral.
- [Derived] Font family: IBM Plex Sans Thai for Thai, English, and numbers.
  No display/serif family is used in the product interface.
- Hierarchy: A compressed product scale from 12–24px, with 600–700 weight for
  headings and labels. Page titles do not exceed 24px on desktop.
- Language considerations: Thai labels use comfortable line height; identifiers,
  counts, times, and dates use tabular figures where comparison matters.

## Shape and elevation

- [User choice] Corner character: Balanced and professional.
- [Derived] Radius scale: 8px controls/chips, 10px buttons/inputs, 12px panels,
  16px only for major empty states and login containment. Pills are reserved for
  status, compact filters, and avatars.
- Border and shadow behavior: Neutral panels use one subtle border. Cards do not
  combine colored backgrounds, strong borders, blur, and shadows. Shadows are
  reserved for menus, dialogs, sticky bars, and other real elevation.

## Density and spacing

- [User choice] Density: Balanced overall, compact and data-forward in tables and
  filters.
- [Derived] Spacing rhythm: 4px base grid; related controls use 8–12px gaps,
  component groups 16px, and major sections 24px.
- Control sizing: 40px visual height on desktop with at least 44px touch targets
  where controls are used on mobile.
- Content width and layout behavior: Dense operational pages use the available
  desktop width. Forms use readable constrained columns. No decorative empty
  gutters compete with the task.

## Components and interaction

- Actions: One dark-green primary action per region. Secondary actions are neutral;
  destructive actions are red. Network actions show immediate loading/disabled
  feedback.
- Forms: Persistent labels, clear required state, visible focus, and error messages
  that explain recovery. Advanced filters are progressively disclosed.
- Navigation: Familiar, compact top navigation with a clear active state and a
  mobile sheet. Profile and role information are secondary to page navigation.
- Data display: Statuses are text-labelled chips, numeric comparisons align by
  place value, identifiers remain prominent, long text truncates safely, and bulk
  actions appear contextually after selection.
- Cards and panels: A panel exists only when containment expresses a real group.
  Nested decorative cards are removed.
- Modals, sheets, and popovers: Blocking confirmation uses an accessible modal;
  simple filters or help use non-blocking disclosure. Focus is contained and
  returned.
- Loading, empty, error, success, and disabled states: Every main view and network
  action provides an explicit state. No-results states include a way to clear the
  current filters.

## Imagery and icons

- [User choice] Direction: Data and icon-led; imagery is limited to the login
  brand moment.
- [Derived] Usage rules: Lucide is the primary product icon family. Existing icon
  libraries may remain only where replacement creates functional risk, but each
  visible region uses one consistent stroke style. No emoji is used as an
  interface icon.

## Motion

- [User choice] Energy: Subtle and task-focused.
- [Derived] Duration: 150ms for color/press feedback and 180–200ms for panels,
  menus, and dialogs. Motion communicates state rather than creating page-entry
  choreography.
- Reduced motion: Existing `prefers-reduced-motion` behavior remains mandatory.

## Responsive behavior

- Mobile: Navigation becomes a sheet; data becomes task-focused cards; primary
  actions remain reachable; touch targets are at least 44px.
- Tablet: Filters use two-column grouping and tables may scroll only when a card
  representation would lose important relationships.
- Desktop: Search, filters, summary, contextual actions, and the data table share
  a strict common width and alignment.
- Long content and localization: Transformer IDs and statuses never wrap
  unpredictably; area text truncates with access to the full value where needed.

## Accessibility

- Contrast: All text, focus, border, and semantic pairs target WCAG AA.
- Keyboard and focus: Interactive elements remain reachable, focus-visible is
  obvious, dialogs contain focus, and focus returns after close.
- Touch targets: At least 44×44px for mobile interaction.
- Color-independent meaning: Status and urgency always include text/icon meaning.
- Motion: Reduced-motion preference disables non-essential transitions.

## Inherited and replaced

- [Inherited] Keep: Workflow, page routes, role permissions, request and OMS
  semantics, business-calendar logic, Thai operational language, responsive
  table/card split, and PeaTransformer logo.
- Evolve: Hierarchy, navigation density, filtering, summary ownership, table
  scanning, form grouping, feedback, accessibility, and component consistency.
- Replace: Purple/green token conflict, serif display type, decorative gradients,
  background grids, heavy blur, oversized radii, stacked shadows, and decorative
  status color.

## Do and don't

### Do

- Lead with urgent operational work and its next action.
- Use neutral space and alignment before adding containers.
- Use green for action/selection and semantic color for real status.
- Preserve all existing business behavior while improving presentation.

### Don't

- Make the application resemble a campaign or landing page.
- Use a different accent color for each card or icon.
- Put a card inside another card solely for decoration.
- Hide critical status or destructive intent behind color alone.

## Open decisions

- None. The product owner delegated the detailed visual decisions and confirmed
  the direction above.
