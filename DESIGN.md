---
name: Murmullo
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#4d4541'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#7e7570'
  outline-variant: '#d0c4be'
  surface-tint: '#615e5c'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1d1b1a'
  on-primary-container: '#878381'
  inverse-primary: '#cbc5c3'
  secondary: '#5e53a6'
  on-secondary: '#ffffff'
  secondary-container: '#aea3fd'
  on-secondary-container: '#403487'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#3d0507'
  on-tertiary-container: '#c26b66'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7e1df'
  primary-fixed-dim: '#cbc5c3'
  on-primary-fixed: '#1d1b1a'
  on-primary-fixed-variant: '#494645'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c8bfff'
  on-secondary-fixed: '#190361'
  on-secondary-fixed-variant: '#463a8d'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#3d0507'
  on-tertiary-fixed-variant: '#77302e'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 46px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  editorial-callout:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-shortcut:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an intimate, quiet, and deeply human desktop presence. Designed
specifically for macOS, it balances the precision of Apple Human Interface Guidelines with an
organic, sentient warmth. Rather than feeling like a sterile utility or a high-velocity enterprise
dictation tool, the interface acts as a silent companion—patient, calm, and effortlessly receptive.

The aesthetic fuses **Warm Editorial Minimalism** with **Organic Glassmorphism**:

- **Tactile Softness:** Calming off-white and warm cream backgrounds replace cold digital grays,
  grounding the user in an environment reminiscent of fine paper and ambient workspace light.
- **Atmospheric Depth:** Frosted translucency (`backdrop-filter: blur(24px)`), diffuse organic
  shadows tinted with warm clay and graphite, and smooth continuous curvature create an effortless
  floating feel.
- **Biomorphic Identity:** The companion entity—a dark, luminous, translucent fluid shape with
  expressive white eyes—functions as the central focal point. The surrounding UI defers entirely to
  this being, framing its fluid state changes (resting, listening, processing, transcribed) with
  understated elegance.
- **Thoughtful Editorial Touch:** Clean, humanist sans-serif typography is paired with delicate,
  hand-notated editorial accents that evoke personal marginalia and creative thinking aloud.

## Colors

The palette revolves around a calming ceramic light space anchored by warm off-whites, contrasted
against velvety graphite ink tones and gentle bioluminescent chromatic whispers (lavender, soft
blush, morning blue, and warm apricot).

### Surfaces & Backgrounds

- **Base Canvas (`#EDE8DF` to `#F5F2EB`):** A soft, natural cream gradient providing depth without
  the glare of pure `#FFFFFF`.
- **Surface Elevation (`#FAF8F5`):** Used for foreground containers, floating pill bars, cards, and
  modal sheets with 85%–92% opacity and backdrop blur.
- **Surface Subtle Border (`#E6E0D6` / `rgba(28, 26, 25, 0.07)`):** Ultra-faint hairline separation
  ensuring floating panels remain anchored against light backgrounds.

### Neutrals & Text Hierarchy

- **Ink Primary (`#1C1A19`):** Dense, warm graphite charcoal for primary headings, active icons, and
  primary pill buttons.
- **Ink Secondary (`#5A5551`):** Calibrated muted umber for secondary body, descriptive subtext, and
  inactive control labels.
- **Ink Tertiary (`#8C847E`):** Delicate stone tint for metadata, keybindings (`⌘K`), timestamps,
  and unselected states.

### Bioluminescent Chromatics & Semantic Accents

- **Companion Core (`#232128` with `#3E3A4B`):** Translucent smoky obsidian forming the base body of
  the entity, infused with subsurface scatter.
- **Aurora Iris (`#8A7FD6`):** Gentle lavender-violet applied to listening pulses, speech glow
  ripples, and primary focus indicators.
- **Warm Blush (`#E0837E`):** Recording indicators, audio live-frequency crests, and tag accents.
- **Atmospheric Sky (`#7AA2C0`):** Audio waveform playback, transcription states, and secondary
  status tags.
- **Sage / Meadow (`#729B79`):** Subdued success confirmations and finalized states.

## Typography

The type system balances geometric clarity with literary warmth.

- **Primary Interface Typeface (`Plus Jakarta Sans`):** Selected for its organic humanist counters,
  gentle curves, and legibility at compact desktop and status bar scales. Headings feature tightened
  tracking (`-0.02em` to `-0.03em`) for a confident, sculpted editorial hierarchy.
- **Editorial Sub-Narrative (`Newsreader` Italic):** Used selectively for companion thoughts,
  floating philosophical quips (_"Una pequeña presencia que te escucha"_), and humanized marginalia.
  It introduces an intimate, literary personality into an otherwise clean digital utility.
- **Keyboard Shortcut Tokens (`code-shortcut`):** Displayed with tabular glyphs in muted stone,
  enclosed in soft pill badges (`⌘ + Space`, `⌥ Space`) that seamlessly blend into search bars and
  action triggers.

## Layout & Spacing

The layout is built around two primary viewport scenarios: **The macOS Companion Island (Floating
Overlay)** and **The Main Workstation Canvas**.

### 1. macOS Floating Dynamic Bar / Island

- A detached, self-centering floating capsule that hovers above the user's active application (code
  editor, browser, notes).
- Height maintains a default of `56px` to `64px`, expanding horizontally from compact listening mode
  (`180px`) up to transcribed preview mode (`460px`).
- Internal element spacing adheres to `space-sm` (8px) between micro-controls and `space-md` (16px)
  separating the companion entity avatar from live transcription preview.

### 2. Main Workstation App Canvas

- **Three-Tier Architecture:**
  - **Left Rail (`240px`):** App identity, navigation pill group, audio settings, user presence
    indicator.
  - **Central Stage (Fluid, minimum `580px`):** Welcome greeting, companion state interaction zone,
    quick-prompt pills, and chronological feed of murmurs.
  - **Right Inspector Drawer (`360px` - `420px`):** Selected murmur details, audio playback track,
    full text inspector, AI synthesis, and action bar.
- **Margins & Gutters:** Base canvas padding is `margin: 2rem` (32px), with `1.25rem` (20px) gutters
  between internal surface panels to guarantee spacious atmospheric breathing room.

## Elevation & Depth

Visual hierarchy uses a refined layering recipe that pairs ambient, tinted multi-stage drop shadows
with frosted glass refraction.

### Atmospheric Tiers

1. **Canvas Level 0 (Desktop Background):** Matte cream tint (`#F5F2EB`), non-elevated.
2. **Surface Level 1 (Panels & Sidebar):** Frosted translucent fill `rgba(250, 248, 245, 0.72)` with
   `backdrop-filter: blur(28px) saturate(140%)` and a micro-border
   `1px solid rgba(255, 255, 255, 0.65)`.
3. **Surface Level 2 (Cards & Selected Items):** Solid or semi-translucent `#FAF8F5`, elevated with
   an ultra-soft dual shadow:
   - Ambient: `0 4px 20px -2px rgba(45, 42, 41, 0.04)`
   - Contact: `0 1px 3px 0 rgba(45, 42, 41, 0.02)`
4. **Surface Level 3 (Floating HUD & Contextual Menus):** High-prominence floating overlay:
   - Background: `rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(32px)`.
   - Shadow Stack: `0 20px 40px -8px rgba(35, 33, 40, 0.08)`,
     `0 6px 14px -3px rgba(35, 33, 40, 0.04)`, `inset 0 1px 0 0 rgba(255, 255, 255, 0.9)`.
5. **Companion Luminescence:** The dark entity casts a colored ambient aura directly onto surfaces
   below it. In default state, a lavender-indigo diffuse blur (`rgba(138, 127, 214, 0.18)` blur
   radius `24px`); while recording, a warm coral blur (`rgba(224, 131, 126, 0.22)`).

## Shapes

The design system adopts a **Level 3 (Pill-shaped & Ultra-Curved)** visual form language. Sharp
corners and aggressive angles are deliberately avoided to maintain an organic, tactile, and
protective feel.

- **Floating Bars & HUDs:** Full capsule geometry (`border-radius: 9999px` / `radius.pill`) for
  floating dictation widgets, quick action buttons, and keyboard chips.
- **Surface Cards & Flyouts:** `radius.xl` (24px) to `32px`, creating squircle-like window
  containers consistent with modern macOS aesthetic guidelines.
- **Nested Controls:** Inner elements strictly obey concentric curvature rules: a container of
  `24px` radius housing an inner button with `8px` padding applies a `16px` (`radius.lg`) corner
  radius to preserve geometric harmony.

## Components

### 1. The Floating Companion Bar

- **Base Style:** Capsule pill floating in absolute window coordinates. Backed by frosted white
  acrylic (`rgba(255, 255, 255, 0.88)`), surrounded by a micro-border `rgba(255, 255, 255, 0.7)` and
  Level 3 ambient shadow.
- **Avatar Anchor:** The companion sprite sits slightly overflowing the capsule perimeter, reacting
  with micro-squash-and-stretch upon audio input.
- **Waveform Area:** Minimalist vertical sound equalizer bars (`width: 2.5px`,
  `border-radius: 9999px`, color: `rgba(28, 26, 25, 0.35)` with real-time reactive height).

### 2. Buttons & Triggers

- **Primary Pill:** Background `#1C1A19`, text `#FAF8F5`, `font-weight: 500`. On hover, slight scale
  (`1.02`) and subtle luminescence glow.
- **Secondary Glass Pill:** Background `rgba(28, 26, 25, 0.05)`, text `#1C1A19`, micro-border
  `rgba(28, 26, 25, 0.06)`. Hover: `rgba(28, 26, 25, 0.08)`.
- **Icon Actions:** `36px × 36px` circular click targets. Clean 1.5px stroke Apple SF-compatible
  iconography with subtle center transitions.

### 3. List Rows & Murmullo Items

- **Card Style:** Clean off-white surface (`#FAF8F5`) with `rounded-xl` (20px), padding `16px 20px`.
- **Row Anatomy:** Left mini-avatar showing the companion's state during recording, central title
  with one-line truncated preview (`color: #5A5551`), right metadata chip group (timestamp, context
  pill, options overflow).
- **Hover State:** Subtle upward translation `-1px` and surface color shift to `#FFFFFF` with shadow
  Level 2 activation.

### 4. Chips & Metadata Tags

- **Pill Badges:** Capsule form with `padding: 4px 10px`, typography `label-sm`.
- **Context Color Coding:**
  - _Work / Trabajo:_ Tinted `#EBF1F7`, text `#3D688E`.
  - _Design / Diseño:_ Tinted `#F4F0F9`, text `#6E5696`.
  - _Meetings / Reuniones:_ Tinted `#FDF0F0`, text `#A44C47`.
  - _Personal:_ Tinted `#EDF4EE`, text `#47784E`.

### 5. Input & Global Command Bar

- **Search & Quick-Dictate:** Large capsule input with inner keyboard shortcut pill (`⌘K`). Zero
  default border; subtle inset shadow `rgba(28, 26, 25, 0.03)` with tinted lavender focus border
  `rgba(138, 127, 214, 0.4)`.

### 6. Audio Player & Inspector Card

- **Embedded Audio Deck:** Integrated waveform track with light graphite scrub head and
  high-precision playback controls (`1x`, pause/resume, bookmark, copy summary).
- **Tabbed Pill Switcher:** Segmented control embedded in light gray container with a sliding white
  pill indicator.
