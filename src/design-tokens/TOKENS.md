# Lumina Design Tokens Reference

**Version:** 1.0.0
**Source of Truth:** `tokens.json`
**Description:** Lumina AI Visibility Platform -- Design Token Source of Truth

This document is the canonical reference for every design token used across the Lumina platform. All tokens are defined in `tokens.json` and consumed as CSS custom properties. If a value you need is not listed here, it does not exist in the system -- request its addition rather than hardcoding.

---

## Quick Reference

### Naming Convention

Tokens follow a structured naming pattern:

```
--{category}-{group}-{scale}
```

Examples:

- `--color-primary-600` -- Primary brand purple at the 600 weight
- `--font-size-lg` -- Large font size (16px)
- `--spacing-4` -- 16px spacing unit
- `--radius-md` -- Medium border radius (6px)
- `--shadow-sm` -- Small box shadow

### Scale System

Color scales run from `50` (lightest) to `950` (darkest). Lower numbers are used for backgrounds and subtle fills; higher numbers are used for text and strong UI elements:

| Range    | Purpose                                    |
| -------- | ------------------------------------------ |
| 50--100  | Backgrounds, selected states, subtle fills |
| 200--300 | Borders, dividers, hover backgrounds       |
| 400--500 | Secondary text, icons, placeholder text    |
| 600      | Base / brand color, primary actions        |
| 700--900 | Headings, strong text, dark overlays       |
| 950      | Near-black, extreme contrast               |

---

## Rules

1. **Never use raw hex values.** Every color, spacing value, shadow, and radius must come from a token.
2. **Always check TOKENS.md before adding a new token.** The value you need likely already exists.
3. **Do not invent one-off tokens.** If a design requires a value outside this system, discuss with the team and update `tokens.json` first.
4. **Use semantic tokens where available.** Prefer `--color-surface-card` over `--color-neutral-50` when styling a card background, and prefer `--color-border-default` over `--color-neutral-200` for borders.
5. **Respect the scale.** Do not skip levels (e.g., jumping from primary-100 to primary-600) without a clear contrast or interaction-state reason.
6. **Keep token usage consistent.** If a component uses `--color-primary-600` for its active state, all similar components should do the same.

---

## Colors

### Primary

The primary purple palette. Used for brand identity, call-to-action buttons, links, focus rings, and active states.

| Token         | CSS Custom Property   | Value     | Usage Guidance                                          |
| ------------- | --------------------- | --------- | ------------------------------------------------------- |
| `primary-50`  | `--color-primary-50`  | `#F5F3FF` | Light primary background, selected row/item highlight   |
| `primary-100` | `--color-primary-100` | `#EDE9FE` | Light primary background, selected states, badges       |
| `primary-200` | `--color-primary-200` | `#DDD6FE` | Soft primary fills, hover on light primary backgrounds  |
| `primary-300` | `--color-primary-300` | `#C4B5FD` | Primary decorative borders, progress bar tracks         |
| `primary-400` | `--color-primary-400` | `#A78BFA` | Icons on dark backgrounds, secondary primary accents    |
| `primary-500` | `--color-primary-500` | `#8B5CF6` | Hover on primary surfaces, lighter CTA variant          |
| `primary-600` | `--color-primary-600` | `#7C3AED` | Primary brand color, main CTA buttons, active states    |
| `primary-700` | `--color-primary-700` | `#6D28D9` | Dark variant for text on light backgrounds, pressed CTA |
| `primary-800` | `--color-primary-800` | `#5B21B6` | Dark variant for headings on light primary backgrounds  |
| `primary-900` | `--color-primary-900` | `#4C1D95` | Dark variant for strong text on light primary fills     |
| `primary-950` | `--color-primary-950` | `#2E1065` | Extreme dark primary, rarely used                       |

### Accent

The accent cyan/teal palette. Used for secondary emphasis, complementary highlights, and differentiating from the primary palette.

| Token        | CSS Custom Property  | Value     | Usage Guidance                                   |
| ------------ | -------------------- | --------- | ------------------------------------------------ |
| `accent-50`  | `--color-accent-50`  | `#ECFEFF` | Light accent background, accent badge background |
| `accent-100` | `--color-accent-100` | `#CFFAFE` | Light accent fills, tag backgrounds              |
| `accent-200` | `--color-accent-200` | `#A5F3FC` | Soft accent fills, hover on accent backgrounds   |
| `accent-300` | `--color-accent-300` | `#67E8F9` | Accent decorative borders, sparkline colors      |
| `accent-400` | `--color-accent-400` | `#22D3EE` | Accent icons, chart highlights                   |
| `accent-500` | `--color-accent-500` | `#06B6D4` | Base accent color, secondary buttons             |
| `accent-600` | `--color-accent-600` | `#0891B2` | Accent links, active accent state                |
| `accent-700` | `--color-accent-700` | `#0E7490` | Accent text on light backgrounds                 |
| `accent-800` | `--color-accent-800` | `#155E75` | Dark accent text                                 |
| `accent-900` | `--color-accent-900` | `#164E63` | Strong accent text on light fills                |
| `accent-950` | `--color-accent-950` | `#083344` | Extreme dark accent, rarely used                 |

### Neutral

The neutral slate palette. Used for text, backgrounds, borders, and all non-colored UI chrome.

| Token         | CSS Custom Property   | Value     | Usage Guidance                                      |
| ------------- | --------------------- | --------- | --------------------------------------------------- |
| `neutral-50`  | `--color-neutral-50`  | `#F8FAFC` | Page background                                     |
| `neutral-100` | `--color-neutral-100` | `#F1F5F9` | Sidebar background, subtle backgrounds, hover fills |
| `neutral-200` | `--color-neutral-200` | `#E2E8F0` | Default borders, input borders, table row dividers  |
| `neutral-300` | `--color-neutral-300` | `#CBD5E1` | Strong borders, dividers, disabled input borders    |
| `neutral-400` | `--color-neutral-400` | `#94A3B8` | Placeholder text, disabled text, tertiary icons     |
| `neutral-500` | `--color-neutral-500` | `#64748B` | Secondary text, icons, meta information             |
| `neutral-600` | `--color-neutral-600` | `#475569` | Body text, description text                         |
| `neutral-700` | `--color-neutral-700` | `#334155` | Headings, strong text, labels                       |
| `neutral-800` | `--color-neutral-800` | `#1E293B` | Primary text, titles, high-emphasis content         |
| `neutral-900` | `--color-neutral-900` | `#0F172A` | Primary text maximum contrast, page titles          |
| `neutral-950` | `--color-neutral-950` | `#020617` | Near-black, extreme contrast, rarely used           |

### Semantic -- Success

Green palette for positive states, completion indicators, confirmations, and healthy status.

| Token         | CSS Custom Property   | Value     | Usage Guidance                                      |
| ------------- | --------------------- | --------- | --------------------------------------------------- |
| `success-50`  | `--color-success-50`  | `#ECFDF5` | Success banner/alert background                     |
| `success-100` | `--color-success-100` | `#D1FAE5` | Light success fill, success badge background        |
| `success-200` | `--color-success-200` | `#A7F3D0` | Soft success fills                                  |
| `success-300` | `--color-success-300` | `#6EE7B7` | Success decorative borders                          |
| `success-400` | `--color-success-400` | `#34D399` | Success icons, progress complete                    |
| `success-500` | `--color-success-500` | `#10B981` | Base success color, checkmarks, positive indicators |
| `success-600` | `--color-success-600` | `#059669` | Success buttons, strong success state               |
| `success-700` | `--color-success-700` | `#047857` | Success text on light backgrounds                   |
| `success-800` | `--color-success-800` | `#065F46` | Dark success text                                   |
| `success-900` | `--color-success-900` | `#064E3B` | Strong success text on light fills                  |

### Semantic -- Warning

Amber/yellow palette for caution states, partial completion, and attention-needed indicators.

| Token         | CSS Custom Property   | Value     | Usage Guidance                               |
| ------------- | --------------------- | --------- | -------------------------------------------- |
| `warning-50`  | `--color-warning-50`  | `#FFFBEB` | Warning banner/alert background              |
| `warning-100` | `--color-warning-100` | `#FEF3C7` | Light warning fill, warning badge background |
| `warning-200` | `--color-warning-200` | `#FDE68A` | Soft warning fills                           |
| `warning-300` | `--color-warning-300` | `#FCD34D` | Warning decorative borders                   |
| `warning-400` | `--color-warning-400` | `#FBBF24` | Warning icons                                |
| `warning-500` | `--color-warning-500` | `#F59E0B` | Base warning color, caution indicators       |
| `warning-600` | `--color-warning-600` | `#D97706` | Warning buttons, strong warning state        |
| `warning-700` | `--color-warning-700` | `#B45309` | Warning text on light backgrounds            |
| `warning-800` | `--color-warning-800` | `#92400E` | Dark warning text                            |
| `warning-900` | `--color-warning-900` | `#78350F` | Strong warning text on light fills           |

### Semantic -- Error

Red palette for errors, destructive actions, validation failures, and critical alerts.

| Token       | CSS Custom Property | Value     | Usage Guidance                                        |
| ----------- | ------------------- | --------- | ----------------------------------------------------- |
| `error-50`  | `--color-error-50`  | `#FEF2F2` | Error banner/alert background                         |
| `error-100` | `--color-error-100` | `#FEE2E2` | Light error fill, error badge background              |
| `error-200` | `--color-error-200` | `#FECACA` | Soft error fills                                      |
| `error-300` | `--color-error-300` | `#FCA5A5` | Error decorative borders                              |
| `error-400` | `--color-error-400` | `#F87171` | Error icons                                           |
| `error-500` | `--color-error-500` | `#EF4444` | Base error color, inline validation, destructive hint |
| `error-600` | `--color-error-600` | `#DC2626` | Destructive buttons, strong error state               |
| `error-700` | `--color-error-700` | `#B91C1C` | Error text on light backgrounds                       |
| `error-800` | `--color-error-800` | `#991B1B` | Dark error text                                       |
| `error-900` | `--color-error-900` | `#7F1D1D` | Strong error text on light fills                      |

### Semantic -- Info

Blue palette for informational messages, new item indicators, and neutral status callouts.

| Token      | CSS Custom Property | Value     | Usage Guidance                                       |
| ---------- | ------------------- | --------- | ---------------------------------------------------- |
| `info-50`  | `--color-info-50`   | `#EFF6FF` | Info banner/alert background                         |
| `info-100` | `--color-info-100`  | `#DBEAFE` | Light info fill, info badge background               |
| `info-200` | `--color-info-200`  | `#BFDBFE` | Soft info fills                                      |
| `info-300` | `--color-info-300`  | `#93C5FD` | Info decorative borders                              |
| `info-400` | `--color-info-400`  | `#60A5FA` | Info icons                                           |
| `info-500` | `--color-info-500`  | `#3B82F6` | Base info color, informational indicators, new items |
| `info-600` | `--color-info-600`  | `#2563EB` | Info links, strong info state                        |
| `info-700` | `--color-info-700`  | `#1D4ED8` | Info text on light backgrounds                       |
| `info-800` | `--color-info-800`  | `#1E40AF` | Dark info text                                       |
| `info-900` | `--color-info-900`  | `#1E3A8A` | Strong info text on light fills                      |

### Severity

Single-value tokens mapped to specific severity levels. Use these for risk/severity badges and indicators.

| Token      | CSS Custom Property         | Value     | Usage Guidance                                  |
| ---------- | --------------------------- | --------- | ----------------------------------------------- |
| `critical` | `--color-severity-critical` | `#DC2626` | Critical severity badge, highest risk indicator |
| `high`     | `--color-severity-high`     | `#F97316` | High severity badge, elevated risk              |
| `medium`   | `--color-severity-medium`   | `#F59E0B` | Medium severity badge, moderate risk            |
| `low`      | `--color-severity-low`      | `#3B82F6` | Low severity badge, minimal risk                |

### Status

Single-value tokens for workflow/entity status indicators.

| Token       | CSS Custom Property        | Value     | Usage Guidance                               |
| ----------- | -------------------------- | --------- | -------------------------------------------- |
| `new`       | `--color-status-new`       | `#3B82F6` | Newly created items, unread indicators       |
| `active`    | `--color-status-active`    | `#7C3AED` | Currently active/in-progress items           |
| `completed` | `--color-status-completed` | `#10B981` | Successfully finished items                  |
| `partial`   | `--color-status-partial`   | `#F59E0B` | Partially completed items, in-between states |
| `failed`    | `--color-status-failed`    | `#EF4444` | Failed or errored items                      |
| `cancelled` | `--color-status-cancelled` | `#64748B` | Cancelled or abandoned items                 |
| `paused`    | `--color-status-paused`    | `#94A3B8` | Paused or on-hold items                      |
| `archived`  | `--color-status-archived`  | `#CBD5E1` | Archived or retired items                    |

### Surface

Semantic surface tokens for major layout regions. Prefer these over raw neutral values when styling surfaces.

| Token      | CSS Custom Property        | Value     | Usage Guidance                                  |
| ---------- | -------------------------- | --------- | ----------------------------------------------- |
| `page`     | `--color-surface-page`     | `#F8FAFC` | Main page background                            |
| `card`     | `--color-surface-card`     | `#FFFFFF` | Card background, content panels                 |
| `sidebar`  | `--color-surface-sidebar`  | `#F1F5F9` | Sidebar background, secondary navigation panels |
| `elevated` | `--color-surface-elevated` | `#FFFFFF` | Elevated surfaces (modals, dropdowns, popovers) |

### Border

Semantic border tokens. Use these instead of picking neutral values directly for border colors.

| Token     | CSS Custom Property      | Value     | Usage Guidance                                         |
| --------- | ------------------------ | --------- | ------------------------------------------------------ |
| `default` | `--color-border-default` | `#E2E8F0` | Standard borders on cards, inputs, table cells         |
| `subtle`  | `--color-border-subtle`  | `#F1F5F9` | Very light borders, section separators within surfaces |
| `strong`  | `--color-border-strong`  | `#CBD5E1` | Prominent borders, dividers needing higher contrast    |
| `focus`   | `--color-border-focus`   | `#7C3AED` | Focus rings, active input borders                      |

---

## Typography

### Font Family

| Token  | CSS Custom Property  | Value                                                            | Usage Guidance                     |
| ------ | -------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `sans` | `--font-family-sans` | `Inter, system-ui, -apple-system, sans-serif`                    | All UI text (default)              |
| `mono` | `--font-family-mono` | `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace` | Code blocks, technical values, IDs |

### Font Size

| Token  | CSS Custom Property | Value  | Usage Guidance                               |
| ------ | ------------------- | ------ | -------------------------------------------- |
| `xs`   | `--font-size-xs`    | `12px` | Captions, fine print, helper text, badges    |
| `sm`   | `--font-size-sm`    | `13px` | Secondary labels, table cells, sidebar items |
| `base` | `--font-size-base`  | `14px` | Default body text, form inputs, buttons      |
| `lg`   | `--font-size-lg`    | `16px` | Emphasized body text, card titles            |
| `xl`   | `--font-size-xl`    | `18px` | Section headings, dialog titles              |
| `2xl`  | `--font-size-2xl`   | `20px` | Page sub-headings                            |
| `3xl`  | `--font-size-3xl`   | `24px` | Page headings                                |
| `4xl`  | `--font-size-4xl`   | `30px` | Large page titles, dashboard hero numbers    |
| `5xl`  | `--font-size-5xl`   | `36px` | Extra-large display text, marketing headings |

### Font Weight

| Token      | CSS Custom Property      | Value | Usage Guidance                            |
| ---------- | ------------------------ | ----- | ----------------------------------------- |
| `normal`   | `--font-weight-normal`   | `400` | Body text, descriptions, default weight   |
| `medium`   | `--font-weight-medium`   | `500` | Labels, navigation items, subtle emphasis |
| `semibold` | `--font-weight-semibold` | `600` | Headings, button text, table headers      |
| `bold`     | `--font-weight-bold`     | `700` | Strong emphasis, page titles, hero text   |

### Line Height

| Token     | CSS Custom Property     | Value   | Usage Guidance                          |
| --------- | ----------------------- | ------- | --------------------------------------- |
| `tight`   | `--line-height-tight`   | `1.25`  | Headings, compact UI elements           |
| `snug`    | `--line-height-snug`    | `1.375` | Sub-headings, short labels              |
| `normal`  | `--line-height-normal`  | `1.5`   | Body text (default), paragraphs         |
| `relaxed` | `--line-height-relaxed` | `1.625` | Long-form content, improved readability |

### Letter Spacing

| Token     | CSS Custom Property        | Value     | Usage Guidance                          |
| --------- | -------------------------- | --------- | --------------------------------------- |
| `tighter` | `--letter-spacing-tighter` | `-0.02em` | Large display headings (4xl+)           |
| `tight`   | `--letter-spacing-tight`   | `-0.01em` | Headings (2xl--3xl)                     |
| `normal`  | `--letter-spacing-normal`  | `0em`     | Body text (default)                     |
| `wide`    | `--letter-spacing-wide`    | `0.025em` | All-caps labels, overline text          |
| `wider`   | `--letter-spacing-wider`   | `0.05em`  | Small all-caps labels, strong overlines |

---

## Spacing

All spacing is based on a 4px base unit. Use these tokens for padding, margin, and gap.

| Token | CSS Custom Property | Value  | Usage Guidance                                     |
| ----- | ------------------- | ------ | -------------------------------------------------- |
| `0`   | `--spacing-0`       | `0px`  | No spacing                                         |
| `0.5` | `--spacing-0-5`     | `2px`  | Hairline gap, icon-to-text micro adjustment        |
| `1`   | `--spacing-1`       | `4px`  | Tight inner padding, inline element gap            |
| `1.5` | `--spacing-1-5`     | `6px`  | Compact padding variant                            |
| `2`   | `--spacing-2`       | `8px`  | Default inline gap, small component padding        |
| `2.5` | `--spacing-2-5`     | `10px` | Between compact padding and standard               |
| `3`   | `--spacing-3`       | `12px` | Standard inner padding, icon + label gap           |
| `3.5` | `--spacing-3-5`     | `14px` | Between standard and comfortable padding           |
| `4`   | `--spacing-4`       | `16px` | Default component padding, card inner padding      |
| `5`   | `--spacing-5`       | `20px` | Comfortable padding, section gap within a card     |
| `6`   | `--spacing-6`       | `24px` | Page padding, section spacing, card gap in grid    |
| `7`   | `--spacing-7`       | `28px` | Between section and large spacing                  |
| `8`   | `--spacing-8`       | `32px` | Large section spacing                              |
| `9`   | `--spacing-9`       | `36px` | Between large and extra-large spacing              |
| `10`  | `--spacing-10`      | `40px` | Extra-large section gap                            |
| `11`  | `--spacing-11`      | `44px` | Between extra-large spacing levels                 |
| `12`  | `--spacing-12`      | `48px` | Major section dividers, page-level vertical rhythm |
| `14`  | `--spacing-14`      | `56px` | Large page sections                                |
| `16`  | `--spacing-16`      | `64px` | Hero areas, large vertical separation              |
| `20`  | `--spacing-20`      | `80px` | Extra-large layout spacing                         |
| `24`  | `--spacing-24`      | `96px` | Maximum layout spacing, full section separation    |

---

## Border Radius

| Token  | CSS Custom Property | Value    | Usage Guidance                                  |
| ------ | ------------------- | -------- | ----------------------------------------------- |
| `none` | `--radius-none`     | `0px`    | No rounding (sharp corners)                     |
| `sm`   | `--radius-sm`       | `4px`    | Subtle rounding, badges, small chips            |
| `md`   | `--radius-md`       | `6px`    | Default rounding for buttons, inputs, dropdowns |
| `lg`   | `--radius-lg`       | `8px`    | Cards, modals, larger containers                |
| `xl`   | `--radius-xl`       | `12px`   | Large cards, featured content panels            |
| `2xl`  | `--radius-2xl`      | `16px`   | Hero panels, marketing sections                 |
| `full` | `--radius-full`     | `9999px` | Circles (avatars), pills (tags, toggle tracks)  |

---

## Shadows

| Token | CSS Custom Property | Value                                                                      | Usage Guidance                                        |
| ----- | ------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `xs`  | `--shadow-xs`       | `0 1px 2px 0 rgba(0, 0, 0, 0.03)`                                          | Very subtle lift, inline elements, flat buttons hover |
| `sm`  | `--shadow-sm`       | `0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)`      | Default card shadow, input focus ring complement      |
| `md`  | `--shadow-md`       | `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)`   | Dropdowns, popovers, hover-elevated cards             |
| `lg`  | `--shadow-lg`       | `0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.03)` | Modals, dialog overlays, maximally elevated surfaces  |

---

## Layout

Fixed layout dimensions for the application shell.

| Token              | CSS Custom Property          | Value    | Usage Guidance                                      |
| ------------------ | ---------------------------- | -------- | --------------------------------------------------- |
| `sidebarWidth`     | `--layout-sidebar-width`     | `240px`  | Expanded sidebar width                              |
| `sidebarCollapsed` | `--layout-sidebar-collapsed` | `48px`   | Collapsed sidebar width (icon-only)                 |
| `topbarHeight`     | `--layout-topbar-height`     | `48px`   | Top navigation bar height                           |
| `contentMaxWidth`  | `--layout-content-max-width` | `1280px` | Maximum width for main content area                 |
| `pagePadding`      | `--layout-page-padding`      | `24px`   | Standard page-level horizontal and vertical padding |

---

## Transitions

Timing presets for CSS transitions and animations.

| Token     | CSS Custom Property    | Value                                     | Usage Guidance                                        |
| --------- | ---------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `fast`    | `--transition-fast`    | `150ms ease`                              | Hover color changes, opacity toggles, micro feedback  |
| `default` | `--transition-default` | `200ms ease`                              | Default for most transitions (buttons, inputs, cards) |
| `slow`    | `--transition-slow`    | `300ms ease`                              | Panel open/close, sidebar expand/collapse             |
| `spring`  | `--transition-spring`  | `500ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy/playful motion, tooltips, toasts appearing     |

---

## Z-Index

Layering scale to ensure predictable stacking order. Always use these tokens instead of arbitrary z-index numbers.

| Token      | CSS Custom Property  | Value | Usage Guidance                                       |
| ---------- | -------------------- | ----- | ---------------------------------------------------- |
| `dropdown` | `--z-index-dropdown` | `50`  | Dropdown menus, select option lists                  |
| `sticky`   | `--z-index-sticky`   | `100` | Sticky headers, pinned table columns                 |
| `overlay`  | `--z-index-overlay`  | `200` | Full-screen overlays, backdrop dimming layers        |
| `modal`    | `--z-index-modal`    | `300` | Modal dialogs, confirmation prompts                  |
| `popover`  | `--z-index-popover`  | `400` | Popovers and tooltips that appear above modals       |
| `toast`    | `--z-index-toast`    | `500` | Toast notifications, always-on-top feedback messages |

---

## Breakpoints

Responsive breakpoints for media queries. Use mobile-first (`min-width`) by default.

| Token | CSS Custom Property | Value    | Usage Guidance                           |
| ----- | ------------------- | -------- | ---------------------------------------- |
| `sm`  | `--breakpoint-sm`   | `640px`  | Small devices, large phones in landscape |
| `md`  | `--breakpoint-md`   | `768px`  | Tablets in portrait, small laptops       |
| `lg`  | `--breakpoint-lg`   | `1024px` | Tablets in landscape, standard laptops   |
| `xl`  | `--breakpoint-xl`   | `1280px` | Desktop screens, wide layouts enabled    |
| `2xl` | `--breakpoint-2xl`  | `1536px` | Large desktops, ultra-wide content areas |

---

## Changelog

| Version | Date | Notes             |
| ------- | ---- | ----------------- |
| 1.0.0   | --   | Initial token set |
