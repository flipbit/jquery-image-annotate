# Note Positioning & Z-Index Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two visual issues: hovered note tooltips rendering behind sibling annotation areas, and notes/forms being too narrow when their annotation area is narrow.

**Architecture:** A pure `computeNoteLeft()` function in `src/positioning.ts` handles horizontal centering + viewport clamping. It's called by `AnnotateView.show()` and `AnnotateEdit` constructor. (`resetPosition()` hides the tooltip, so positioning happens on next `show()` — no direct call needed.) CSS changes handle z-index on hover, width sizing, and two new custom properties.

**Tech Stack:** TypeScript, Vitest + jsdom, CSS custom properties

---

## Chunk 1: Pure positioning function and CSS changes

### Task 1: `computeNoteLeft` pure function — tests

**Files:**
- Create: `test/positioning.test.ts`

- [ ] **Step 1: Write failing tests for `computeNoteLeft`**

```typescript
import { describe, test, expect } from 'vitest';
import { computeNoteLeft } from '../src/positioning';

describe('computeNoteLeft', () => {
  test('centers note under area when space allows', () => {
    // area is 100px wide at viewport x=200, note is 300px, viewport is 1000px
    // centered left = (100 - 300) / 2 = -100 (relative to area)
    const left = computeNoteLeft(300, 200, 100, 1000);
    expect(left).toBe(-100);
  });

  test('note narrower than area is still centered', () => {
    // area is 300px wide, note is 100px
    // centered left = (300 - 100) / 2 = 100 (relative to area)
    const left = computeNoteLeft(100, 200, 300, 1000);
    expect(left).toBe(100);
  });

  test('clamps right edge when note would overflow viewport', () => {
    // area at viewport x=800, area width=100, note width=300, viewport=1000
    // centered left = (100 - 300) / 2 = -100 → note left in viewport = 800 + (-100) = 700
    // note right = 700 + 300 = 1000 → exactly fits, no clamping
    const left = computeNoteLeft(300, 800, 100, 1000);
    expect(left).toBe(-100);
  });

  test('shifts left when right edge overflows viewport', () => {
    // area at viewport x=850, area width=100, note width=300, viewport=1000
    // centered left = -100 → note left in viewport = 850 + (-100) = 750
    // note right = 750 + 300 = 1050 → overflows by 50
    // adjusted left = -100 - 50 = -150
    const left = computeNoteLeft(300, 850, 100, 1000);
    expect(left).toBe(-150);
  });

  test('shifts right when left edge overflows viewport', () => {
    // area at viewport x=50, area width=100, note width=300, viewport=1000
    // centered left = -100 → note left in viewport = 50 + (-100) = -50
    // overflows left by 50
    // adjusted left = -100 + 50 = -50
    const left = computeNoteLeft(300, 50, 100, 1000);
    expect(left).toBe(-50);
  });

  test('left clamp takes priority when note wider than viewport', () => {
    // area at viewport x=100, area width=50, note width=500, viewport=400
    // centered left = (50 - 500) / 2 = -225 → note left in viewport = 100 + (-225) = -125
    // Right clamp: note right = -125 + 500 = 375 (within 400), no right shift
    // Left clamp: note left = -125 → overflows left by 125
    // adjusted left = -225 + 125 = -100 → note starts at viewport x=0
    // Left clamp runs last and takes priority, ensuring the left edge is visible
    const left = computeNoteLeft(500, 100, 50, 400);
    expect(left).toBe(-100);
  });

  test('area at viewport x=0 with centered note stays at 0', () => {
    // area at viewport x=0, area width=100, note width=100, viewport=1000
    // centered left = 0
    const left = computeNoteLeft(100, 0, 100, 1000);
    expect(left).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/positioning.test.ts`
Expected: FAIL — module `../src/positioning` not found

- [ ] **Step 3: Implement `computeNoteLeft`**

Create `src/positioning.ts`:

```typescript
/**
 * Compute the horizontal `left` value for a note/form element
 * relative to its parent annotation area, centering it under the area
 * and clamping to viewport edges.
 *
 * @param noteWidth - Measured width of the note/form element
 * @param areaLeftInViewport - The area's left edge in viewport coordinates
 * @param areaWidth - Width of the annotation area
 * @param viewportWidth - Browser viewport width (window.innerWidth)
 * @returns CSS `left` value in pixels, relative to the area element
 */
export function computeNoteLeft(
  noteWidth: number,
  areaLeftInViewport: number,
  areaWidth: number,
  viewportWidth: number,
): number {
  // Center the note under the area
  let left = (areaWidth - noteWidth) / 2;

  // Check viewport overflow
  const noteLeftInViewport = areaLeftInViewport + left;
  const noteRightInViewport = noteLeftInViewport + noteWidth;

  // Clamp right edge
  if (noteRightInViewport > viewportWidth) {
    left -= noteRightInViewport - viewportWidth;
  }

  // Clamp left edge (takes priority — ensures left edge is visible)
  const adjustedNoteLeft = areaLeftInViewport + left;
  if (adjustedNoteLeft < 0) {
    left -= adjustedNoteLeft;
  }

  return left;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/positioning.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/positioning.ts test/positioning.test.ts
git commit -m "feat: add computeNoteLeft pure positioning function"
```

### Task 2: CSS changes — z-index, note width, custom properties

**Files:**
- Modify: `src/annotation.css:33-65` (custom property declarations)
- Modify: `src/annotation.css:120-122` (`.image-annotate-area-hover`)
- Modify: `src/annotation.css:126-128` (`.image-annotate-area-editable-hover`)
- Modify: `src/annotation.css:129-143` (`.image-annotate-note`)
- Modify: `src/annotation.css:153-169` (`.image-annotate-edit-form`)

- [ ] **Step 1: Add custom property declarations to `.image-annotate-canvas`**

In `src/annotation.css`, add after line 61 (after `--image-annotate-edit-shadow: none;`):

```css
  --image-annotate-note-max-width: 300px;
  --image-annotate-edit-max-width: 300px;
```

- [ ] **Step 2: Add `z-index: 1` to hover rules**

In `.image-annotate-area-hover` (around line 120-122), add `z-index: 1;`:

```css
.image-annotate-area-hover {
  background-color: var(--image-annotate-hover-bg);
  z-index: 1;
}
```

In `.image-annotate-area-editable-hover div` (around line 126-128), add a new rule for the parent. Currently there's no separate `.image-annotate-area-editable-hover` rule (only `.image-annotate-area-editable-hover div`). Add one:

```css
.image-annotate-area-editable-hover {
  z-index: 1;
}
```

- [ ] **Step 3: Update `.image-annotate-note` styles**

Change in `.image-annotate-note` (lines 129-143):
- Replace `left: -1px;` with `left: 0;`
- Replace `max-width: 200px;` with `max-width: var(--image-annotate-note-max-width);`
- Add `width: max-content;`

Result:

```css
.image-annotate-note {
  background-color: var(--image-annotate-note-bg);
  border: solid 1px var(--image-annotate-note-border);
  border-radius: var(--image-annotate-note-radius);
  box-shadow: var(--image-annotate-note-shadow);
  color: var(--image-annotate-note-text);
  display: none;
  font-family: var(--image-annotate-font-family);
  font-size: var(--image-annotate-font-size);
  left: 0;
  max-width: var(--image-annotate-note-max-width);
  padding: 3px 7px;
  position: absolute;
  top: calc(100% + 7px);
  width: max-content;
}
```

- [ ] **Step 4: Update `.image-annotate-edit-form` styles**

Change in `.image-annotate-edit-form` (lines 153-169):
- Replace `left: -1px;` with `left: 0;`
- Add `max-width: var(--image-annotate-edit-max-width);`

Result includes existing properties plus the new `max-width`:

```css
.image-annotate-edit-form {
  background-color: var(--image-annotate-edit-bg);
  border: 1px solid var(--image-annotate-edit-border);
  border-radius: var(--image-annotate-edit-radius);
  box-shadow: var(--image-annotate-edit-shadow);
  box-sizing: border-box;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 7px;
  left: 0;
  max-width: var(--image-annotate-edit-max-width);
  min-width: 250px;
  padding: 7px;
  position: absolute;
  top: calc(100% + 7px);
  width: max-content;
}
```

- [ ] **Step 5: Run all existing tests to check for regressions**

Run: `npx vitest run`
Expected: All tests pass. The CSS changes don't affect jsdom-based tests since jsdom doesn't parse stylesheets.

- [ ] **Step 6: Commit**

```bash
git add src/annotation.css
git commit -m "feat: CSS z-index on hover, note width sizing, custom properties"
```

## Chunk 2: Integrate positioning into view and edit

### Task 3: Integrate `computeNoteLeft` into AnnotateView

**Files:**
- Modify: `src/annotate-view.ts:1-4` (imports)
- Modify: `src/annotate-view.ts:110-117` (`show()` method)
- Modify: `test/annotate-view.test.ts:66-71` (update existing test)
- Modify: `test/annotate-view.test.ts` (add new tests)

- [ ] **Step 1: Write failing tests for z-index on hover**

Add to `test/annotate-view.test.ts` in the "show and hide" describe block:

```typescript
  test('show() sets z-index on the area for stacking above siblings', () => {
    const { view } = createImageWithNote({ editable: false });

    view.show();

    // The hover class is applied, which has z-index: 1 in CSS.
    // In jsdom we can't test CSS rules, but we can verify the class is applied.
    expect(view.area.classList.contains('image-annotate-area-hover')).toBe(true);
  });

  test('show() sets z-index on editable area for stacking above siblings', () => {
    const { view } = createImageWithNote({ editable: true });

    view.show();

    expect(view.area.classList.contains('image-annotate-area-editable-hover')).toBe(true);
  });
```

Note: z-index is applied via CSS class, so the existing hover class tests already cover this. The tests above are just explicit about the intent. If these are deemed redundant with existing tests at lines 129-143, skip them.

- [ ] **Step 2: Write failing tests for tooltip positioning on show()**

Add a new describe block to `test/annotate-view.test.ts`:

```typescript
describe('annotateView — smart tooltip positioning', () => {
  test('show() sets inline left on tooltip', () => {
    const { view } = createImageWithNote();

    view.show();

    // In jsdom, getBoundingClientRect returns zeros, so computeNoteLeft(0, 0, 0, 0) = 0
    // The important thing is that an inline left IS set
    expect(view.tooltip.style.left).not.toBe('');
  });

  test('hide() does not clear inline left (left persists for next show)', () => {
    const { view } = createImageWithNote();

    view.show();
    view.hide();

    // Left style remains set from the last show()
    expect(view.tooltip.style.left).not.toBe('');
  });

});
```

- [ ] **Step 3: Update existing test that asserts no inline positioning**

The test at `test/annotate-view.test.ts:66-71` ("tooltip has no inline positioning (CSS handles it)") needs to be updated. The tooltip now gets inline `left` from `show()`, but NOT at construction time. Update to:

```typescript
  test('tooltip has no inline positioning at construction (set on show)', () => {
    const { view } = createImageWithNote({ top: 50, left: 100, height: 60 });

    // Before show() is called, no inline left/top
    expect(view.tooltip.style.top).toBe('');
    expect(view.tooltip.style.left).toBe('');
  });
```

- [ ] **Step 4: Run tests to verify the new tests fail**

Run: `npx vitest run test/annotate-view.test.ts`
Expected: New positioning tests FAIL (show() doesn't set inline left yet), existing tests still pass

- [ ] **Step 5: Implement positioning in `AnnotateView`**

Modify `src/annotate-view.ts`:

Add import at top:

```typescript
import { computeNoteLeft } from './positioning';
```

Update `show()` method (lines 110-117):

```typescript
  show(): void {
    // Position tooltip: render hidden, measure, compute left, then show
    this.tooltip.style.visibility = 'hidden';
    this.tooltip.style.display = 'block';

    const noteRect = this.tooltip.getBoundingClientRect();
    const areaRect = this.area.getBoundingClientRect();
    const left = computeNoteLeft(noteRect.width, areaRect.left, areaRect.width, window.innerWidth);
    this.tooltip.style.left = left + 'px';

    this.tooltip.style.visibility = '';

    if (!this.editable) {
      this.area.classList.add('image-annotate-area-hover');
    } else {
      this.area.classList.add('image-annotate-area-editable-hover');
    }
  }
```

**Spec deviation:** The spec lists `resetPosition()` as a call site, but it's unnecessary — `resetPosition()` sets `display: 'none'`, and the tooltip will be repositioned on the next `show()` via hover. No change needed to `resetPosition()`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run test/annotate-view.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/annotate-view.ts test/annotate-view.test.ts
git commit -m "feat: smart tooltip positioning in AnnotateView"
```

### Task 4: Integrate `computeNoteLeft` into AnnotateEdit

**Files:**
- Modify: `src/annotate-edit.ts:1-4` (imports)
- Modify: `src/annotate-edit.ts:57-103` (constructor — form creation and focus)
- Modify: `test/annotate-edit.test.ts:505-526` (update existing tests)
- Modify: `test/annotate-edit.test.ts` (add new tests)

- [ ] **Step 1: Write failing test for edit form positioning**

Add to `test/annotate-edit.test.ts` in the "form positioning" describe block:

```typescript
  test('form gets inline left positioning after creation', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form') as HTMLElement;
    // In jsdom, getBoundingClientRect returns zeros, so left will be '0px'
    expect(form.style.left).not.toBe('');
  });
```

- [ ] **Step 2: Update existing test that asserts no inline left**

The test at `test/annotate-edit.test.ts:517-526` ("form has no inline top/left positioning") needs updating. The form now gets inline `left`. Update to:

```typescript
  test('form gets inline left positioning but no inline top', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form') as HTMLElement;
    expect(form.style.top).toBe('');
    expect(form.style.left).not.toBe('');
  });
```

- [ ] **Step 3: Run tests to verify the new/updated tests fail**

Run: `npx vitest run test/annotate-edit.test.ts`
Expected: Updated positioning test FAILS (form doesn't have inline left yet)

- [ ] **Step 4: Implement positioning in `AnnotateEdit`**

Modify `src/annotate-edit.ts`:

Add import at top:

```typescript
import { computeNoteLeft } from './positioning';
```

In the constructor, after `this.area.appendChild(this.form);` (line 73) and before the pointerdown listener (line 76), add positioning logic:

```typescript
    // Position the form: render hidden, measure, compute centered left, then show
    this.form.style.visibility = 'hidden';

    const formRect = this.form.getBoundingClientRect();
    const areaRect = this.area.getBoundingClientRect();
    const formLeft = computeNoteLeft(formRect.width, areaRect.left, areaRect.width, window.innerWidth);
    this.form.style.left = formLeft + 'px';

    this.form.style.visibility = '';
```

**Remove** the existing `this.textarea.focus();` at line 103 and place it AFTER the visibility is restored (after `this.form.style.visibility = '';`). This ensures the textarea is visible when focused. Do NOT leave the original focus() call — it must be moved, not duplicated.

The constructor flow becomes:
1. Create form elements and append to area
2. Set `visibility: hidden`
3. Measure and compute position
4. Set inline `left`
5. Restore `visibility`
6. Set up pointerdown listener
7. Focus textarea (moved from original line 103)
8. Set up keydown listener
9. Create buttons

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/annotate-edit.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (no regressions)

- [ ] **Step 7: Commit**

```bash
git add src/annotate-edit.ts test/annotate-edit.test.ts
git commit -m "feat: smart form positioning in AnnotateEdit"
```

## Chunk 3: Documentation and demo updates

### Task 5: Update themes demo and README

**Files:**
- Modify: `demo/themes.html:28-50` (dark theme CSS)
- Modify: `demo/themes.html:53-73` (minimal theme CSS)
- Modify: `demo/themes.html:105-127` (dark theme code display)
- Modify: `demo/themes.html:134-154` (minimal theme code display)
- Modify: `README.md:352-356` (CSS variable table — after edit-shadow row)

- [ ] **Step 1: Add new CSS variables to dark theme in `demo/themes.html`**

In the dark theme CSS block (lines 28-50), add after `--image-annotate-edit-shadow`:

```css
      --image-annotate-note-max-width: 350px;
      --image-annotate-edit-max-width: 350px;
```

Also add the same lines to the dark theme code display block (lines 105-127), after the `--image-annotate-edit-shadow` line.

- [ ] **Step 2: Add new CSS variables to minimal theme in `demo/themes.html`**

In the minimal theme CSS block (lines 53-73), add after `--image-annotate-edit-shadow`:

```css
      --image-annotate-note-max-width: 280px;
      --image-annotate-edit-max-width: 280px;
```

Also add the same lines to the minimal theme code display block (lines 134-154), after the `--image-annotate-edit-shadow` line.

- [ ] **Step 3: Update README CSS variable table**

In `README.md`, after the `--image-annotate-note-shadow` row (line 352), add:

```markdown
| `--image-annotate-note-max-width` | `300px` | Tooltip max width |
```

After the `--image-annotate-edit-shadow` row (line 356), add:

```markdown
| `--image-annotate-edit-max-width` | `300px` | Edit form max width |
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Build completes with no errors. The CSS changes are bundled into `dist/css/annotate.min.css`.

- [ ] **Step 5: Commit**

```bash
git add demo/themes.html README.md dist/
git commit -m "docs: add note/edit max-width CSS variables to themes and README"
```

Note: `npm run build` rebuilds all dist/ artifacts (JS bundles include the new positioning code from Chunks 1-2). Commit all dist/ changes here.

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run jQuery 4 tests**

Run: `npm run test:jquery4`
Expected: All tests pass

- [ ] **Step 3: Manual smoke test**

Open `demo/themes.html` in browser. For each theme:
1. Hover over a narrow annotation — tooltip should be centered, wider than the area, up to 300px
2. Hover over an annotation near the right edge — tooltip should shift left to stay in viewport
3. Hover over one annotation whose tooltip overlaps another area — tooltip should render above the area
4. Click to edit a narrow annotation — form should be centered under the area
5. Verify the new CSS variables are shown in the theme code blocks
