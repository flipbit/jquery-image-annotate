# Code Review Report

## Review Metadata

- **Branch:** v2-beta-3
- **Base:** main
- **Work Item:** N/A
- **Change set:** branch diff
- **Files changed:** 29
- **Lines:** +1515 / -70
- **Design docs:** `docs/superpowers/specs/2026-03-10-css-theming-design.md`, `docs/superpowers/specs/2026-03-10-note-positioning-design.md`
- **Plans:** `docs/superpowers/plans/2026-03-10-css-theming.md`, `docs/superpowers/plans/2026-03-10-note-positioning.md`
- **Reviewed:** 2026-03-10

---

## Summary of Changes

This branch implements two features: (1) a CSS custom property theming system scoped via `data-theme` attributes, with dark and minimal demo themes; and (2) smart tooltip/form positioning with viewport clamping and z-index management on hover. Additionally, it includes an unplanned `clampNote` function that constrains annotation positions to image bounds on load, and a refactor of button icons from `background-image` to CSS `mask-image`.

---

## Strengths & Weaknesses

### Strengths

- `src/positioning.ts:12-37` — `computeNoteLeft` is a pure function with no DOM dependencies, trivially testable and reused across both view and edit modes.
- `src/annotate-view.ts:113-121` — The visibility-hidden-then-measure-then-show pattern prevents flash of incorrectly-positioned content. Well-executed.
- `src/annotation.css:194-222` — Migration from `background-image` to `mask-image` for button icons lets icon color follow `--image-annotate-button-text` automatically, eliminating per-theme SVG variants.
- `src/annotate-image.ts:22-32` — `clampNote` handles all four overflow directions correctly, clamping width/height before positions to ensure no negative values.
- `test/positioning.test.ts:4-62` — Excellent pure-function testing with documented arithmetic in every test case.
- `test/clamp-note.test.ts:74-79` — Immutability verification shows awareness of defensive API design.

### Weaknesses

- `src/annotate-image.ts:272-278` and `421-427` — Duplicated 6-line clamping loop in `load()` and `loadFromApi()`.
- `src/annotate-edit.ts:77` — `positionForm()` measures the form before buttons are appended, so initial width measurement may be inaccurate.
- `test/annotate-view.test.ts:104-124` — Positioning tests only assert "something was set" due to jsdom limitations; no integration test with non-zero measurements.
- `src/annotate-edit.ts:94,108` — `positionForm()` after drag/resize has no dedicated test.

---

## Hiring Recommendation

**Recommended Level:** Senior

**Justification:**

- `src/positioning.ts:12-36` — Pure utility function with thorough test coverage and explicit design decisions (left-edge priority documented in comment and tested).
- `src/annotate-view.ts:112-121`, `src/annotate-edit.ts:132-137` — Correct abstraction boundaries: positioning logic extracted to standalone module, consumed by both view and edit.
- `src/annotate-image.ts:21-31` — Edge cases handled systematically in `clampNote` with all four overflow directions plus oversized annotations.
- `src/annotation.css:194-222` — The mask-image refactor is a subtle but architecturally correct technique for themeable icons.
- `test/annotate-image.test.ts:939-968` — Integration and immutability checks show testing discipline.

**Gaps to Staff:**
- Duplicated clamping loop could be extracted to a private method.
- `clampNote` lives in `annotate-image.ts` rather than its own module (asymmetry with `positioning.ts`).
- No vertical positioning clamping for tooltips near the bottom of the viewport.
- E2E theme tests assert colors differ but not what they are specifically.

---

## Delta to Staff-Level

**D1:** `src/annotate-image.ts:272-278` — Clamping loop is copy-pasted in `load()` and `loadFromApi()`. A staff engineer would extract a `clampNotes()` private method. **Effort: S**

**D2:** `src/annotate-image.ts:21-31` — `clampNote` is exported from `annotate-image.ts`. Given `computeNoteLeft` lives in `positioning.ts`, a staff engineer would co-locate or create a dedicated module for geometric utility functions. **Effort: S**

**D3:** `src/annotate-view.ts:112-121` — No vertical positioning logic. A staff engineer would either implement vertical clamping or explicitly document the limitation. **Effort: M**

**D4:** `e2e/themes.spec.ts:38-87` — Theme tests assert colors differ but not specific expected values. A staff engineer would assert exact computed values to catch both-themes-broken scenarios. **Effort: S**

---

## Issues

| ID | Severity | File:Line | Issue | Fix |
|----|----------|-----------|-------|-----|
| M1 | M | `src/annotate-image.ts:272-278,421-427` | Duplicated clamp-note loop in `load()` and `loadFromApi()` | Extract shared `clampNotes()` private method |
| M2 | M | `src/annotate-image.ts:272-278` | `clampNote` returns new object but each call site manually assigns 4 properties back | Have `clampNote` accept full note and return via spread, or extract `applyClamp()` helper |
| M3 | M | `src/annotate-edit.ts:77` | `positionForm()` measures form before buttons are appended; width may exclude button row | Move `positionForm()` call to after buttons are appended (after line 128) |
| H1 | H | `test/annotate-view.test.ts:104-124` | View positioning tests only assert `style.left` is not empty; never tests correct value | Stub `getBoundingClientRect` with non-zero values and assert computed left matches expected |
| H2 | H | `src/annotate-edit.ts:94,108` | `positionForm()` in drag/resize `onStop` has no test | Add tests that perform drag/resize sequences and assert `form.style.left` is updated |
| L1 | L | `src/annotation.css:49-51` | SVG icon fill `%23fff` is misleading when used as mask (fill is irrelevant) | Add comment explaining fill is irrelevant with mask-image |
| L2 | L | `src/annotate-image.ts:162-164` | `theme` option not validated (informational only) | No action needed |

### Spec Compliance Issues

| ID | Severity | File:Line | Issue | Fix |
|----|----------|-----------|-------|-----|
| M4 | M | `src/annotation.css:194-222` | Button mask-image refactor not described in either plan (scope creep) | Acceptable scope creep — enables theming to work properly |
| M5 | M | `src/annotate-image.ts:21-28` | `clampNote` function is entirely unplanned (scope creep) | Acceptable scope creep — fixes a real issue with out-of-bounds annotations |
| M6 | M | `demo/themes.html:174-179` | Demo uses 4 notes with different coordinates vs plan's 3 notes | Update e2e test or demo to be consistent |
| L3 | L | `src/annotate-view.ts:88-108` | `resetPosition()` not used as a call site per design spec | Plan explicitly notes this as intentional deviation |
| L4 | L | `demo/fixtures/get.json` | Demo fixture data completely rewritten (unplanned) | Cosmetic, no action needed |

### Test Coverage Issues

| ID | Severity | File:Line | Issue | Fix |
|----|----------|-----------|-------|-----|

(H1 and H2 from main issues table cover the test gaps)

---

## Recommended Fixes

- H1 - Add integration tests for view tooltip positioning with stubbed `getBoundingClientRect`
- H2 - Add tests for `positionForm()` after drag and resize operations
- M1 - Extract duplicated clamping loop into private method
- M2 - Simplify `clampNote` call sites with spread or helper
- M3 - Move `positionForm()` call to after buttons are appended
- M6 - Reconcile demo note count (4 notes) with e2e test expectation (3 notes)
