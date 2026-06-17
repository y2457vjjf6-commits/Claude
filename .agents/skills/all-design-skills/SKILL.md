---
name: all-design-skills
description: Combined design skill reference covering frontend design philosophy, UI/UX guidelines, web interface review, animation craft, visual polish, and design interrogation. Merges frontend-design, ui-ux-pro-max, web-design-guidelines, impeccable, emil-design-eng, and grill-me into one file.
---

# All Design Skills — Combined Reference

This document merges six design skills into a single reference. Each section is self-contained.

---

# 1. Frontend Design (Anthropic)

Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take one real aesthetic risk you can justify.

## Ground it in the subject

If the brief does not pin down what the product or subject is, pin it yourself before designing: name one concrete subject, its audience, and the page's single job, and state your choice. If there's any information in your memory about the human's preferences, context about what they're building, or designs you've made before – use that as a hint. The subject's own world, its materials, instruments, artifacts, and vernacular, is where distinctive choices come from. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is a thesis. Open with the most characteristic thing in the subject's world, in whatever form makes sense for it: a headline, an image, an animation, a live demo, an interactive moment. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the template answer, only use if that's truly the best option.

Typography carries the personality of the page. Pair the display and body faces deliberately, not the same families you would reach for on any other project, and set a clear type scale with intentional weights, widths, and spacing. Make the type treatment itself a memorable part of the design, not a neutral delivery vehicle for the content.

Structure is information. Structural devices, numbering, eyebrows, dividers, labels, should encode something true about the content, not decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence - like a real process or a typed timeline where order carries information the reader needs. Question if choices like numbered markers actually make sense before incorporating them.

Leverage motion deliberately. Think about where and if animation can serve the subject: a page-load sequence, a scroll-triggered reveal, hover micro-interactions, ambient atmosphere. An orchestrated moment usually lands harder than scattered effects; choose what the direction calls for. However, sometimes less is more, and extra animation contributes to the feeling that the design is AI-generated.

Match complexity to the vision. Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail. Elegance is executing the chosen vision well.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy. Copy can make a design feel as templated as the design itself.

## Process: brainstorm, explore, plan, critique, build, critique again

For calibration: AI-generated design right now clusters around three looks: (1) a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta accent; (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns. All three are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults.

Work in two passes. First, brainstorm a short design plan based on the human's design brief: create a compact token system with color, type, layout, and signature. Color: describe the palette as 4–6 named hex values. Type: the typefaces for 2+ roles (a characterful display face that's used with restraint, a complementary body face, and a utility face for captions or data if needed). Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Signature: the single unique element this page will be remembered by that embodies the brief in an appropriate way.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan exactly and deriving every color and type decision from it.

## Restraint and self-critique

Spend your boldness in one place. Let the signature element be the one memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected. Critique your own work as you build.

## Writing in design

Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Write from the end user's side of the screen. Name things by what people control and recognize, never by how the system is built. Use active voice as default. A control should say exactly what happens when it's used: "Save changes," not "Submit." Keep the register conversational and tuned: plain verbs, sentence case, no filler, with tone matched to the brand and the audience.

---

# 2. UI/UX Pro Max — Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

## Rule Categories by Priority

| Priority | Category | Impact | Key Checks |
|----------|----------|--------|------------|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels |
| 2 | Touch & Interaction | CRITICAL | Min size 44x44px, 8px+ spacing, Loading feedback |
| 3 | Performance | HIGH | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1) |
| 4 | Style Selection | HIGH | Match product type, Consistency, SVG icons (no emoji) |
| 5 | Layout & Responsive | HIGH | Mobile-first breakpoints, Viewport meta, No horizontal scroll |
| 6 | Typography & Color | MEDIUM | Base 16px, Line-height 1.5, Semantic color tokens |
| 7 | Animation | MEDIUM | Duration 150-300ms, Motion conveys meaning, Spatial continuity |
| 8 | Forms & Feedback | MEDIUM | Visible labels, Error near field, Helper text, Progressive disclosure |
| 9 | Navigation Patterns | HIGH | Predictable back, Bottom nav ≤5, Deep linking |
| 10 | Charts & Data | LOW | Legends, Tooltips, Accessible colors |

## Quick Reference

### Accessibility (CRITICAL)
- `color-contrast` - Minimum 4.5:1 ratio for normal text (large text 3:1)
- `focus-states` - Visible focus rings on interactive elements (2-4px)
- `alt-text` - Descriptive alt text for meaningful images
- `aria-labels` - aria-label for icon-only buttons
- `keyboard-nav` - Tab order matches visual order; full keyboard support
- `form-labels` - Use label with for attribute
- `skip-links` - Skip to main content for keyboard users
- `heading-hierarchy` - Sequential h1→h6, no level skip
- `color-not-only` - Don't convey info by color alone (add icon/text)
- `dynamic-type` - Support system text scaling
- `reduced-motion` - Respect prefers-reduced-motion
- `voiceover-sr` - Meaningful accessibilityLabel; logical reading order
- `escape-routes` - Provide cancel/back in modals and multi-step flows

### Touch & Interaction (CRITICAL)
- `touch-target-size` - Min 44x44pt (Apple) / 48x48dp (Material)
- `touch-spacing` - Minimum 8px gap between touch targets
- `hover-vs-tap` - Use click/tap for primary interactions; don't rely on hover alone
- `loading-buttons` - Disable button during async operations; show spinner
- `error-feedback` - Clear error messages near problem
- `standard-gestures` - Use platform standard gestures consistently
- `haptic-feedback` - Use haptic for confirmations; avoid overuse
- `safe-area-awareness` - Keep primary touch targets away from notch/gesture bar/screen edges

### Performance (HIGH)
- `image-optimization` - Use WebP/AVIF, responsive images, lazy load
- `image-dimension` - Declare width/height or use aspect-ratio to prevent CLS
- `font-loading` - Use font-display: swap/optional
- `critical-css` - Prioritize above-the-fold CSS
- `lazy-loading` - Lazy load non-hero components
- `bundle-splitting` - Split code by route/feature
- `virtualize-lists` - Virtualize lists with 50+ items
- `progressive-loading` - Use skeleton screens instead of spinners for >1s operations
- `debounce-throttle` - Use debounce/throttle for high-frequency events

### Style Selection (HIGH)
- `style-match` - Match style to product type
- `consistency` - Use same style across all pages
- `no-emoji-icons` - Use SVG icons (Heroicons, Lucide), not emojis
- `platform-adaptive` - Respect platform idioms (iOS HIG vs Material)
- `elevation-consistent` - Use a consistent elevation/shadow scale
- `dark-mode-pairing` - Design light/dark variants together
- `primary-action` - Each screen should have only one primary CTA

### Layout & Responsive (HIGH)
- `viewport-meta` - width=device-width initial-scale=1 (never disable zoom)
- `mobile-first` - Design mobile-first, then scale up
- `breakpoint-consistency` - Use systematic breakpoints (375 / 768 / 1024 / 1440)
- `readable-font-size` - Minimum 16px body text on mobile
- `line-length-control` - Mobile 35-60 chars; desktop 60-75 chars
- `horizontal-scroll` - No horizontal scroll on mobile
- `spacing-scale` - Use 4pt/8dp incremental spacing system
- `z-index-management` - Define layered z-index scale
- `viewport-units` - Prefer min-h-dvh over 100vh on mobile
- `visual-hierarchy` - Establish hierarchy via size, spacing, contrast — not color alone

### Typography & Color (MEDIUM)
- `line-height` - Use 1.5-1.75 for body text
- `line-length` - Limit to 65-75 characters per line
- `font-pairing` - Match heading/body font personalities
- `font-scale` - Consistent type scale (e.g. 12 14 16 18 24 32)
- `color-semantic` - Define semantic color tokens (primary, secondary, error, surface)
- `color-dark-mode` - Dark mode uses desaturated/lighter tonal variants, not inverted colors
- `color-accessible-pairs` - Foreground/background pairs must meet 4.5:1 (AA)
- `number-tabular` - Use tabular/monospaced figures for data columns and prices

### Animation (MEDIUM)
- `duration-timing` - Use 150-300ms for micro-interactions; complex ≤400ms; avoid >500ms
- `transform-performance` - Use transform/opacity only; avoid animating width/height
- `loading-states` - Show skeleton or progress when loading exceeds 300ms
- `easing` - Use ease-out for entering, ease-in for exiting; avoid linear for UI
- `motion-meaning` - Every animation must express a cause-effect relationship
- `spring-physics` - Prefer spring/physics-based curves for natural feel
- `exit-faster-than-enter` - Exit animations shorter than enter (~60-70%)
- `interruptible` - Animations must be interruptible
- `no-blocking-animation` - Never block user input during an animation

### Forms & Feedback (MEDIUM)
- `input-labels` - Visible label per input (not placeholder-only)
- `error-placement` - Show error below the related field
- `submit-feedback` - Loading then success/error state on submit
- `empty-states` - Helpful message and action when no content
- `confirmation-dialogs` - Confirm before destructive actions
- `inline-validation` - Validate on blur (not keystroke)
- `input-type-keyboard` - Use semantic input types to trigger correct mobile keyboard
- `undo-support` - Allow undo for destructive or bulk actions
- `error-clarity` - Error messages must state cause + how to fix
- `focus-management` - After submit error, auto-focus the first invalid field

### Navigation Patterns (HIGH)
- `bottom-nav-limit` - Bottom navigation max 5 items; use labels with icons
- `back-behavior` - Back navigation must be predictable and consistent
- `deep-linking` - All key screens must be reachable via deep link
- `nav-state-active` - Current location must be visually highlighted
- `modal-escape` - Modals must offer a clear close/dismiss affordance
- `state-preservation` - Navigating back must restore previous scroll/filter/input state
- `adaptive-navigation` - Large screens prefer sidebar; small screens use bottom/top nav

### Charts & Data (LOW)
- `chart-type` - Match chart type to data type (trend→line, comparison→bar, proportion→pie)
- `color-guidance` - Use accessible color palettes; avoid red/green only pairs
- `legend-visible` - Always show legend near the chart
- `tooltip-on-interact` - Provide tooltips showing exact values on hover/tap
- `responsive-chart` - Charts must reflow or simplify on small screens
- `no-pie-overuse` - Avoid pie/donut for >5 categories; switch to bar chart

## How to Use the Search Tool

```bash
# Generate full design system (REQUIRED first step)
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]

# Domain-specific searches
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]

# Stack guidelines
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react-native
```

Available domains: product, style, typography, color, landing, chart, ux, google-fonts, react, web, prompt

## Common Rules for Professional UI

### Icons & Visual Elements
- No Emoji as Structural Icons — use vector-based icons
- Stable Interaction States — no layout-shifting transforms
- Consistent Icon Sizing — define icon sizes as design tokens
- Touch Target Minimum — 44x44pt interactive area

### Light/Dark Mode Contrast
- Surface readability with sufficient opacity/elevation
- Text contrast >=4.5:1 in both modes
- Token-driven theming with semantic color tokens
- Modal scrim 40-60% black for foreground legibility

### Layout & Spacing
- Safe-area compliance for headers, tab bars, CTA bars
- 8dp spacing rhythm maintained consistently
- Scroll content not hidden behind fixed bars
- Adaptive gutters by breakpoint

---

# 3. Web Interface Guidelines (Vercel)

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

Use WebFetch to retrieve the latest rules before each review. The fetched content contains all the rules and output format instructions.

---

# 4. Impeccable — Production-Grade Frontend Design

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft.

## Setup

1. Run `node .agents/skills/impeccable/scripts/context.mjs` once per session.
2. If user invoked a sub-command (`craft`, `shape`, `audit`, `polish`, ...), read `reference/<command>.md`.
3. Familiarize with existing design system, conventions, and components.
4. Read the matching register reference: `reference/brand.md` (marketing/landing/portfolio) or `reference/product.md` (app UI/admin/dashboard).
5. For brand-new projects, run `node .agents/skills/impeccable/scripts/palette.mjs` for brand seed color.

## General Rules

### Color
- Verify contrast: body text ≥4.5:1, large text ≥3:1
- Gray text on colored background looks washed out — use darker shade of background's own hue
- Use OKLCH for new projects
- The cream/sand/beige body bg is the saturated AI default of 2026 — avoid unless the brief demands it
- Pick a color strategy: Restrained, Committed, Full palette, or Drenched

### Typography
- Cap body line length at 65-75ch
- Don't pair fonts that are similar but not identical — pair on a contrast axis
- Hero heading ceiling: clamp() max ≤ 6rem (~96px)
- Display letter-spacing ≥ -0.04em
- Use `text-wrap: balance` on h1-h3; `text-wrap: pretty` on long prose

### Layout
- Vary spacing for rhythm
- Cards are the lazy answer — use only when truly the best affordance
- Flexbox for 1D, Grid for 2D
- Build a semantic z-index scale

### Motion
- Motion should be intentional, not an afterthought
- Ease out with exponential curves (ease-out-quart/quint/expo). No bounce, no elastic
- Reduced motion is not optional — every animation needs `@media (prefers-reduced-motion: reduce)`
- Premium motion: blur, backdrop-filter, clip-path, mask, shadow/glow when they improve the effect

### Interaction
- Dropdowns in overflow:hidden containers will be clipped — use dialog/popover API or portals

## Absolute Bans
- Side-stripe borders (>1px colored accent on cards/list items)
- Gradient text (background-clip: text with gradient)
- Glassmorphism as default decoration
- The hero-metric template (big number, small label, gradient accent)
- Identical card grids (same-sized cards with icon+heading+text repeated)
- Tiny uppercase tracked eyebrow above every section
- Numbered section markers as default scaffolding (01/02/03)
- Text that overflows its container
- `border: 1px solid` + `box-shadow` with blur ≥16px on same element
- `border-radius: 32px+` on cards/sections/inputs (cards top out at 12-16px)
- Hand-drawn/sketchy SVG illustrations
- `repeating-linear-gradient` stripe backgrounds
- Meta-criticism copy

## AI Slop Test

If someone could look at this interface and say "AI made that" without doubt, it's failed. Run the category-reflex check at two altitudes:
- First-order: if someone could guess theme+palette from category alone, rework
- Second-order: if someone could guess aesthetic from category-plus-anti-references, rework again

## Commands

| Command | Description |
|---|---|
| `craft [feature]` | Shape, then build a feature end-to-end |
| `shape [feature]` | Plan UX/UI before writing code |
| `init` | Set up project context |
| `document` | Generate DESIGN.md from existing project code |
| `extract [target]` | Pull reusable tokens and components into design system |
| `critique [target]` | UX design review with heuristic scoring |
| `audit [target]` | Technical quality checks (a11y, perf, responsive) |
| `polish [target]` | Final quality pass before shipping |
| `bolder [target]` | Amplify safe or bland designs |
| `quieter [target]` | Tone down aggressive or overstimulating designs |
| `distill [target]` | Strip to essence, remove complexity |
| `harden [target]` | Production-ready: errors, i18n, edge cases |
| `onboard [target]` | Design first-run flows, empty states, activation |
| `animate [target]` | Add purposeful animations and motion |
| `colorize [target]` | Add strategic color to monochromatic UIs |
| `typeset [target]` | Improve typography hierarchy and fonts |
| `layout [target]` | Fix spacing, rhythm, and visual hierarchy |
| `delight [target]` | Add personality and memorable touches |
| `overdrive [target]` | Push past conventional limits |
| `clarify [target]` | Improve UX copy, labels, and error messages |
| `adapt [target]` | Adapt for different devices and screen sizes |
| `optimize [target]` | Diagnose and fix UI performance |
| `live` | Visual variant mode: pick elements in browser, generate alternatives |

---

# 5. Emil Kowalski's Design Engineering

You are a design engineer with the craft sensibility. You build interfaces where every detail compounds into something that feels right. In a world where everyone's software is good enough, taste is the differentiator.

## Core Philosophy

- **Taste is trained, not innate.** Develop it by surrounding yourself with great work and practicing relentlessly.
- **Unseen details compound.** When a feature functions exactly as someone assumes it should, that's the goal.
- **Beauty is leverage.** Good defaults and good animations are real differentiators.

## The Animation Decision Framework

### 1. Should this animate at all?

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette) | No animation. Ever. |
| Tens of times/day (hover effects, list nav) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare/first-time (onboarding, celebrations) | Can add delight |

**Never animate keyboard-initiated actions.**

### 2. What easing should it use?

- Entering/exiting → ease-out (starts fast, feels responsive)
- Moving/morphing on screen → ease-in-out
- Hover/color change → ease
- Constant motion (marquee, progress) → linear

**Use custom easing curves:**
```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

**Never use ease-in for UI animations** — it starts slow, making the interface feel sluggish.

### 3. How fast should it be?

| Element | Duration |
|---|---|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing/explanatory | Can be longer |

**UI animations should stay under 300ms.**

## Component Building Principles

- **Buttons must feel responsive**: `transform: scale(0.97)` on `:active`
- **Never animate from scale(0)**: start from scale(0.95) with opacity:0
- **Popovers should be origin-aware**: scale from trigger, not center (modals are exempt)
- **Tooltips**: skip delay on subsequent hovers, open instantly with no animation
- **Use CSS transitions over keyframes** for interruptible UI
- **Use blur to mask imperfect transitions**: subtle `filter: blur(2px)` during crossfade
- **Use @starting-style** for element entry animations without JS

## CSS Transform Mastery

- `translateY(100%)` moves by element's own height — use percentages over hardcoded pixels
- `scale()` scales children too — this is a feature for buttons
- `transform-origin` should match where the trigger lives

## clip-path for Animation

- `clip-path: inset(top right bottom left)` for rectangular clipping
- Hold-to-delete: `inset(0 100% 0 0)` → `inset(0 0 0 0)` over 2s linear on :active
- Image reveals: start `inset(0 0 100% 0)`, animate on viewport entry
- Comparison sliders: clip top image, adjust on drag

## Gesture & Drag

- Use velocity for dismissal, not just distance threshold (velocity > 0.11 = dismiss)
- Apply damping at boundaries — things slow down, they don't stop suddenly
- Use pointer capture once dragging starts
- Multi-touch protection: ignore additional touch points mid-drag

## Performance Rules

- Only animate transform and opacity (skip layout and paint)
- Don't update CSS variables on parents during drag — update transform directly
- Framer Motion `x`/`y` props are NOT hardware-accelerated — use full `transform` string
- CSS animations beat JS under load (off main thread)
- Use WAAPI for programmatic CSS animations

## Accessibility

- `prefers-reduced-motion`: keep opacity/color transitions, remove movement
- Gate hover animations behind `@media (hover: hover) and (pointer: fine)`

## Spring Animations

- Use for drag with momentum, "alive" elements, interruptible gestures
- Apple's approach: `{ type: "spring", duration: 0.5, bounce: 0.2 }`
- Keep bounce subtle (0.1-0.3), avoid in most UI contexts
- Springs maintain velocity when interrupted (keyframes restart from zero)

## Stagger Animations

- Keep delays short: 30-80ms between items
- Never block interaction while stagger plays

## Review Checklist

| Issue | Fix |
|---|---|
| `transition: all` | Specify exact properties |
| `scale(0)` entry | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Set to trigger location (modals exempt) |
| Animation on keyboard action | Remove animation entirely |
| Duration > 300ms on UI element | Reduce to 150-250ms |
| Hover without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions |
| Same enter/exit speed | Make exit faster than enter |
| Elements all appear at once | Add stagger delay (30-80ms) |

---

# 6. Grill Me — Design Interrogation

Interview the user relentlessly about every aspect of a plan until reaching a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide a recommended answer.

Ask questions one at a time. If a question can be answered by exploring the codebase, explore the codebase instead.
