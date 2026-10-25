# Arch Improvement Ledger

## Cycle 7 — Render Performance, GPU Compositing & Resilience
- **Date:** 2026-10-25
- **Goal:** Fix blank screen crash caused by toxic `backdrop-blur` cascade exhausting GPU Skia compositor and missing ErrorBoundary.
- **Fixed:**
  - Eradicated all `backdrop-blur-sm` and `backdrop-blur-md` classes across `src/components/`.
  - Added dual-layer `ErrorBoundary` in `app.tsx` and `ReferencesPanel.tsx` with headless unit-tested core (`error-boundary-core.ts`).
  - Added CSS containment (`contain: "paint layout"`) and async image decoding (`decoding="async"`, `loading="lazy"`).
  - Converted desktop-wide modal (`fixed inset-0`) into panel-contained viewer (`absolute inset-0 z-30`) with breadcrumb and zoom controls.
- **Verification:** 44/44 unit tests passing, `npx tsc --noEmit` 0 errors, all files < 250 lines (AP-019).
- **Dual-Circuit Review:** S9 Architectural Reviewer (PASS) & S9 Product Reviewer (PASS).

---

## Cycle 8 — SDK Alignment, Concurrency Serialization & SSRF Hardening
- **Date:** 2026-10-25
- **Goal:** Resolve all architectural observations identified during Cycle 7 deep review.
- **Fixed:**
  - **AP-046 (SDK & Tab API Migration):** Synchronized `@get-bb/plugin-sdk` to 0.6.79 via `bb plugin types`. Migrated `app.slots.threadPanelAction` in `app.tsx` to `app.slots.experimental_tab({ context: { kind: "thread" }, availability: "action", ... })`, eliminating all deprecation warnings.
  - **AP-034 (Concurrency & Storage Serialization):** Created `KeyedAsyncMutex` in `src/utils/async-mutex.ts`. Added per-project mutex in `ReferenceService` and per-file write serialization in `FileReferenceStorage.saveReferences`. Added concurrency stress test in `tests/reference-service.test.ts` verifying 10 parallel adds complete without race conditions.
  - **AP-044 (SSRF & DNS Rebinding Protection):** Created `src/utils/network-guard.ts` with `isPrivateIp` and pre-flight DNS lookup in `MetadataScraper`. Blocks private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`), and cloud metadata VIPs before making outbound HTTP calls.
- **Verification:**
  - `npm test`: 46/46 unit tests passing across 8 suites in 226ms.
  - `npx tsc --noEmit`: 0 errors.
  - Line budgets (AP-019): all files strictly < 250 lines.
  - `npm run build`: 0 warnings, clean production bundle.
  - Runtime: `bb plugin remove references && bb plugin install . --yes` successfully running `references@0.1.2`.
- **Verdict:** PASS
