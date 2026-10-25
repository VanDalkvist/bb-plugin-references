# Implementation Plan: Arch Improvement Cycle 7 — Render Performance & UI Resilience

**Date:** 2026-10-25  
**Project:** `bb-plugin-references`  
**Architecture baseline:** `arch-rules.md` (AP-010 to AP-071)  
**Cognitive/Memory baseline:** gbrain Fact #1624 (GPU memory exhaustion & Skia crash from unbounded filters), `MEMORY.md` (Subtle Elevation tokens)  

---

## 1. Goal
Eliminate the GPU compositor collapse / blank screen bug ("всё пропадает") when opening References in BB IDE by stripping toxic `backdrop-blur` layers, enforcing Subtle Elevation hover discipline, adding a bulletproof React `ErrorBoundary`, and enabling async image decoding with CSS paint containment.

## 2. Architecture Context Map Reference
- **AP-019 (Size Limits):** All modules must strictly stay `< 250` lines.
- **AP-022 (Typed Errors):** Proper error diagnostics with user recovery.
- **AP-054 (Resilient UI):** Component boundaries isolate rendering failures via `ErrorBoundary` with reload button.
- **AP-055 (Frontend Performance):** Zero redundant GPU composite surfaces, removal of invalid `backdrop-filter: blur(var(--blur-sm))` cascades, `decoding="async"`, `contain: paint layout`.
- **AP-068 / AP-070 (Tokens & Motion):** Strict Subtle Elevation (hover accent strictly via `bg-card/90` and `shadow-sm`, zero border-color jumps on hover, scoped `transition-colors duration-150` instead of `transition-all`).

## 3. Findings Selected for Fix
- **[P1] Skia GPU Compositor Crash & Blank Screen from Unbounded Backdrop-Filter Layers** — fix-now
- **[P1] Absence of Root and Component-Level ErrorBoundary** — fix-now
- **[P2] Violations of Subtle Elevation Design Standard on Card Hover** — fix-now
- **[P2] Unoptimized Image Decoding and Missing Paint Isolation** — fix-now

Exclusions:
- **[P3] Retired SDK Slot Warning (`threadPanelAction`)** — log-only (maintained for backward runtime compatibility).

---

## 4. Bounded Fix Slices

### Slice 1: Bulletproof ErrorBoundary Component & Root Protection
- **Target Files:**
  - `src/components/ErrorBoundary.tsx` (new file, < 100 lines)
  - `tests/error-boundary.test.ts` (unit tests for error catching and retry)
  - `app.tsx` (wrap `ThreadPanelComponent` and `NavPanelComponent`)
- **TDD Steps:**
  - Step 1.1: Write failing unit test verifying ErrorBoundary catches render errors, shows friendly fallback, and invokes retry callback.
  - Step 1.2: Implement `src/components/ErrorBoundary.tsx` adhering to BB IDE design tokens.
  - Step 1.3: Run tests to ensure green pass.
  - Step 1.4: Integrate ErrorBoundary into `app.tsx` and `src/components/ReferencesPanel.tsx`.

### Slice 2: Eradicate Toxic `backdrop-blur` and Compositor Bottlenecks
- **Target Files:**
  - `src/components/ReferenceCard.tsx`
  - `src/components/ReferenceCardActions.tsx`
  - `src/components/ReferencesToolbar.tsx`
  - `src/components/ProjectsGridView.tsx`
  - `src/components/InlineReferenceDirective.tsx`
  - `src/components/ReferenceLightbox.tsx`
  - `src/components/AddReferenceModal.tsx`
- **Validation Steps:**
  - Step 2.1: In `ReferenceCard.tsx`:
    - Remove `backdrop-blur-sm` from all badges (anchor, project, domain, source). Use crisp, high-contrast matte badges (`bg-black/85 text-white/95`, `bg-primary text-primary-foreground`).
    - Remove `hover:border-border/80` (enforce Subtle Elevation: maintain static border, elevate via `hover:bg-card/90` and `shadow-sm`).
    - Replace `transition-all duration-150` with `transition-colors duration-150`.
    - Add `contain: paint layout` style to card root to isolate browser paint invalidations.
  - Step 2.2: In `ReferenceCardActions.tsx`:
    - Remove `backdrop-blur-sm` from all 4 buttons.
    - Remove full-height gradient scrim (`bg-gradient-to-b from-black/60`) which forces compositing layers; use clean solid button backgrounds with hover states (`bg-background/90 text-foreground hover:bg-background`).
  - Step 2.3: In `ReferencesToolbar.tsx`:
    - Replace `bg-card/60 backdrop-blur-sm` with solid `bg-card/95 border-b border-border/80`.
  - Step 2.4: In `ProjectsGridView.tsx`:
    - Remove `backdrop-blur-sm` from count badge.
    - Remove `hover:border-primary/50` and `transition-all`.
  - Step 2.5: In `InlineReferenceDirective.tsx`:
    - Remove `backdrop-blur-sm` from loading state.
  - Step 2.6: In `ReferenceLightbox.tsx` and `AddReferenceModal.tsx`:
    - Replace heavy `backdrop-blur-md` / `backdrop-blur-sm` overlays with clean opaque backdrop `bg-black/80`.
  - Step 2.7: Run `npm run build` and check `dist/app.css` to confirm all toxic `backdrop-blur` rules are eliminated.

### Slice 3: Image Async Decoding and Performance Hardening
- **Target Files:**
  - `src/components/ReferenceCard.tsx`
  - `src/components/ProjectsGridView.tsx`
  - `src/components/InlineReferenceDirective.tsx`
  - `src/components/InlineReferencesGalleryDirective.tsx`
- **Validation Steps:**
  - Step 3.1: Add `decoding="async"` to all `<img>` tags to ensure decoding never blocks the UI thread.
  - Step 3.2: Verify aspect-ratio placeholders prevent cumulative layout shift (CLS).

### Slice 4: Verification, Ledger & Memory Update
- **Target Files:**
  - `docs/arch-improvement/review-log.md`
  - `tests/` (all suites pass)
- **Validation Steps:**
  - Step 4.1: Run `npm test` (all tests passing).
  - Step 4.2: Run `npm run build` (clean bundle).
  - Step 4.3: Verify line budgets for all touched files (< 250 lines per AP-019).
  - Step 4.4: Dual-circuit review (S9):
    - Architectural Review (`arch-rules-implementation-review`).
    - Product Review (`arch-improvement-product-review`).
  - Step 4.5: Update ledger `docs/arch-improvement/review-log.md` and sync memory with `gbrain`.
