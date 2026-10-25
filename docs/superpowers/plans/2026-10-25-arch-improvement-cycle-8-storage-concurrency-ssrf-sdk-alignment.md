# Arch Improvement Plan: Cycle 8 — SDK Alignment, Concurrency Serialization & SSRF Hardening

**Project:** `bb-plugin-references`  
**Date:** 2026-10-25  
**Baseline:** `~/Projects/arch-rules/arch-rules.md` (AP-019, AP-034, AP-044, AP-046)  
**State Machine:** `arch-improvement-loop/SKILL.md` (S6 Plan Write -> S7 Plan Review -> S8 Execute Fix Slice -> S9 Verify Gate -> S10 Ledger)

---

## 1. Goal

Fix all three architectural observations identified in the Cycle 7 review:
1. **AP-046 / SDK Alignment:** Migrate deprecated `threadPanelAction` in `app.tsx` to `app.slots.experimental_tab` with `@get-bb/plugin-sdk@0.6.79`, eliminating all build warnings.
2. **AP-034 / Concurrency Serialization:** Implement in-memory per-project write serialization in `FileReferenceStorage` to guarantee FIFO atomicity under concurrent requests.
3. **AP-044 / SSRF & DNS Rebinding Hardening:** Add pre-flight IP resolution check in `MetadataScraper` to block private/local addresses (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fe80::/10`) before making outbound HTTP calls.

---

## 2. Findings Selected for Fix-Now

- [x] **[P3 -> Fix-Now] SDK Tab API Migration (AP-046)**
  - Evidence: `app.tsx:135` (`threadPanelAction` deprecation warning during `npm run build`).
  - Fix: Update `app.tsx` to use `app.slots.experimental_tab({ context: { kind: "thread" }, availability: "action", ... })`.
- [x] **[P3 -> Fix-Now] Atomic Write Serialization Queue (AP-034)**
  - Evidence: `src/storage/reference-storage.ts:58` (parallel writes could race on atomic rename).
  - Fix: Add per-project promise queue map `writeQueues` in `FileReferenceStorage`.
- [x] **[P3 -> Fix-Now] SSRF DNS Resolution Guard (AP-044)**
  - Evidence: `src/services/metadata-scraper.ts:133` (hostname check did not resolve DNS to detect DNS rebinding).
  - Fix: Add pre-fetch DNS IP lookup and check against `isPrivateIp`.

---

## 3. Implementation Plan by Slices

### Slice 1: Concurrency Serialization in Storage (AP-034)
- **Task 1.1:** Add concurrency tests in `tests/reference-service.test.ts` (multiple simultaneous calls to `saveReferences` for the same project).
- **Task 1.2:** Implement per-project promise queue in `src/storage/reference-storage.ts`.
- **Task 1.3:** Verify tests pass deterministically.

### Slice 2: SSRF & DNS Rebinding Protection (AP-044)
- **Task 2.1:** Add tests in `tests/metadata-scraper.test.ts` for private IP detection (`127.0.0.1`, `10.0.0.1`, `192.168.1.1`, `169.254.169.254`, `::1`).
- **Task 2.2:** Add `isPrivateIp` helper and pre-flight DNS check in `src/services/metadata-scraper.ts`.
- **Task 2.3:** Verify tests pass deterministically.

### Slice 3: SDK Tab API Migration (AP-046)
- **Task 3.1:** Update `app.tsx` to use `app.slots.experimental_tab`.
- **Task 3.2:** Run `npm run build` and verify output has 0 warnings.
- **Task 3.3:** Reinstall plugin locally via `bb plugin remove references && bb plugin install . --yes` and verify `bb references list` works.

---

## 4. Verification Gate (S9)
- Run `npm test` (all tests passing).
- Run `npx tsc --noEmit` (0 errors).
- Run line budget check `wc -l` (all files < 250 lines per AP-019).
- Run `bb plugin build` (0 warnings).
- Run black-box user journeys via CLI.
- Update `docs/arch-improvement/review-log.md` with Cycle 8 ledger.
