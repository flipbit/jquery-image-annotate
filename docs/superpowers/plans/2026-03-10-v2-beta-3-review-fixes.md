# v2-beta-3 Review Fixes Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Address code review findings from the v2-beta-3 branch review

**Source Review:** `docs/superpowers/plans/2026-03-10-v2-beta-3-review.md`
**Design Doc:** `docs/superpowers/specs/2026-03-10-css-theming-design.md`, `docs/superpowers/specs/2026-03-10-note-positioning-design.md`
**Implementation Plan:** `docs/superpowers/plans/2026-03-10-css-theming.md`, `docs/superpowers/plans/2026-03-10-note-positioning.md`

---

## Dismissed Issues

| ID | Rationale | Action |
|----|-----------|--------|
| L2 | Theme option is a string passed to `dataset.theme`; validation adds no value | None |
| M4 | Acceptable scope creep — mask-image refactor enables theming to work properly | None |
| M5 | Acceptable scope creep — clampNote fixes real out-of-bounds annotations | None |
| L3 | Intentional deviation, documented in implementation plan | None |
| L4 | Cosmetic demo fixture rewrite | None |
| D3 | Vertical tooltip clamping is new feature scope, not a defect | Add inline comment in `src/annotate-view.ts` `show()` noting horizontal-only clamping is intentional |

---

## Fix Tasks

### Task 1: Extract `clampNotes()` and move to `positioning.ts`
**Addresses:** M1, M2, D1, D2
**Chosen approach:** Create a `clampNotes()` function that loops over notes and applies `clampNote` via spread assignment. Move both `clampNote` and `clampNotes` from `src/annotate-image.ts` to `src/positioning.ts`.
**Files:**
- Modify: `src/positioning.ts`, `src/annotate-image.ts`, `test/clamp-note.test.ts`
**Steps:**
1. Write test in `test/clamp-note.test.ts` for `clampNotes()` — takes array of notes, returns nothing (mutates in place via spread), verifies all notes are clamped
2. Verify test fails (function doesn't exist yet)
3. Move `clampNote` from `src/annotate-image.ts` to `src/positioning.ts`. Add `clampNotes()` that iterates and does `Object.assign(note, clampNote(note, w, h))`. Export both.
4. Update `src/annotate-image.ts`: import `clampNotes` from `./positioning`, replace both 6-line loops in `load()` and `loadFromApi()` with `clampNotes(this.notes, this.naturalWidth, this.naturalHeight)`
5. Verify all tests pass
6. Commit

### Task 2: Add inline comment for `positionForm()` call order
**Addresses:** M3
**Chosen approach:** Add comment at `src/annotate-edit.ts:77` explaining that the initial `positionForm()` call is before buttons but form width is dominated by textarea and `min-width: 250px`; recalculated on drag/resize stop.
**Files:**
- Modify: `src/annotate-edit.ts`
**Steps:**
1. Add inline comment above line 77
2. Verify tests still pass
3. Commit

### Task 3: Add wiring tests for `positionForm()` after drag/resize
**Addresses:** H2
**Chosen approach:** Add tests that trigger drag `onStop` and resize `onStop` callbacks and verify `form.style.left` is updated.
**Files:**
- Modify: `test/annotate-edit.test.ts`
**Steps:**
1. Write test: after entering edit mode and triggering drag `onStop`, `form.style.left` is set
2. Write test: after entering edit mode and triggering resize `onStop`, `form.style.left` is set
3. Verify tests pass
4. Commit

### Task 4: Stub `getBoundingClientRect` in view tooltip positioning tests
**Addresses:** H1
**Chosen approach:** Override `getBoundingClientRect` on tooltip and area elements with known rects, then assert `tooltip.style.left` matches the expected `computeNoteLeft` output.
**Files:**
- Modify: `test/annotate-view.test.ts`
**Steps:**
1. In the "smart tooltip positioning" describe block, replace the existing `show() sets inline left on tooltip` test with one that stubs `getBoundingClientRect` on both tooltip (e.g. width=150) and area (e.g. left=100, width=80), uses jsdom's default `window.innerWidth` (1024), and asserts `tooltip.style.left` equals `computeNoteLeft(150, 100, 80, 1024) + 'px'`
2. Verify test passes
3. Commit

### Task 5: Fix e2e theme test annotation count and add color assertion comments
**Addresses:** M6, D4
**Chosen approach:** Update `toHaveCount(3)` to `toHaveCount(4)` to match the demo's 4 notes. Add inline comments in the color comparison tests explaining why "differ" is asserted instead of exact values.
**Files:**
- Modify: `e2e/themes.spec.ts`
**Steps:**
1. Change `toHaveCount(3)` to `toHaveCount(4)` on line 34
2. Add comments above the `expect(defaultNoteBg).not.toBe(darkNoteBg)` and `expect(defaultNoteBg).not.toBe(minimalNoteBg)` assertions explaining the rationale
3. Commit

### Task 6: Add comment about SVG fill irrelevance with mask-image
**Addresses:** L1
**Chosen approach:** Add comment above the icon custom properties in `src/annotation.css`.
**Files:**
- Modify: `src/annotation.css`
**Steps:**
1. Add comment above the `--image-annotate-icon-save` line explaining that SVG fill values are irrelevant when used as mask-image — visible color comes from `background-color`
2. Verify tests still pass
3. Commit

### Task 7: Add inline comment about horizontal-only tooltip clamping
**Addresses:** D3 (dismissed)
**Chosen approach:** Document the intentional limitation in `src/annotate-view.ts` `show()`.
**Files:**
- Modify: `src/annotate-view.ts`
**Steps:**
1. Add comment in `show()` noting that positioning is horizontal-only; vertical clamping (flipping above the area) is not implemented
2. Commit
