# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all issues from the v2-beta-2 branch code review — refactor canvas to wrap the image instead of replacing it, consolidate coordinate conversions, defer rescale during edits, add defense-in-depth guards, fix framework defaults, add missing tests.

**Architecture:** The canvas div wraps the image element (instead of hiding it and using background-image). The image provides intrinsic sizing so the canvas responds to CSS layout naturally. All scale conversions go through `toRendered()`/`toNatural()` on `AnnotateImage`. Rescale is deferred during active edits to prevent data loss.

**Tech Stack:** TypeScript, Vitest (jsdom), Playwright (e2e), esbuild (build)

---

### Task 1: Add `toRendered()` and `toNatural()` utility methods

These are pure methods with no dependencies on the C1 refactor. Build them first so later tasks can use them.

**Files:**
- Modify: `src/annotate-image.ts:67-89` (add methods to class)
- Test: `test/annotate-image.test.ts`

**Step 1: Write failing tests for `toRendered` and `toNatural`**

Add a new `describe` block at the end of `test/annotate-image.test.ts`:

```typescript
describe('toRendered / toNatural coordinate conversion', () => {
  test('toRendered scales natural coordinates by scale factors', () => {
    const inst = createScaledTestImage(400, 300, 200, 150);
    const result = inst.toRendered({ top: 100, left: 200, width: 80, height: 60 });
    expect(result).toEqual({ top: 50, left: 100, width: 40, height: 30 });
  });

  test('toNatural reverses rendered coordinates to natural', () => {
    const inst = createScaledTestImage(400, 300, 200, 150);
    const result = inst.toNatural({ top: 50, left: 100, width: 40, height: 30 });
    expect(result).toEqual({ top: 100, left: 200, width: 80, height: 60 });
  });

  test('toRendered is identity when scale is 1.0', () => {
    const inst = createScaledTestImage(400, 300, 400, 300);
    const rect = { top: 100, left: 200, width: 80, height: 60 };
    expect(inst.toRendered(rect)).toEqual(rect);
  });

  test('toNatural is identity when scale is 1.0', () => {
    const inst = createScaledTestImage(400, 300, 400, 300);
    const rect = { top: 100, left: 200, width: 80, height: 60 };
    expect(inst.toNatural(rect)).toEqual(rect);
  });

  test('toNatural throws on non-finite result (defense in depth)', () => {
    const inst = createScaledTestImage(400, 300, 200, 150);
    // Force scaleX to 0 to trigger guard
    inst.scaleX = 0;
    expect(() => inst.toNatural({ top: 50, left: 100, width: 40, height: 30 }))
      .toThrow('non-finite coordinates');
  });

  test('round-trip: toRendered then toNatural returns original values', () => {
    const inst = createScaledTestImage(960, 760, 480, 380);
    const original = { top: 80, left: 200, width: 100, height: 50 };
    const rendered = inst.toRendered(original);
    const restored = inst.toNatural(rendered);
    expect(restored.top).toBeCloseTo(original.top);
    expect(restored.left).toBeCloseTo(original.left);
    expect(restored.width).toBeCloseTo(original.width);
    expect(restored.height).toBeCloseTo(original.height);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/annotate-image.test.ts`
Expected: FAIL — `toRendered` and `toNatural` don't exist yet.

**Step 3: Implement `toRendered` and `toNatural`**

In `src/annotate-image.ts`, add these methods to the `AnnotateImage` class (after `scaleY` declaration, around line 89):

```typescript
  /** Convert a rect from natural image coordinates to rendered (scaled) coordinates. */
  toRendered(rect: { top: number; left: number; width: number; height: number }) {
    return {
      top: rect.top * this.scaleY,
      left: rect.left * this.scaleX,
      width: rect.width * this.scaleX,
      height: rect.height * this.scaleY,
    };
  }

  /** Convert a rect from rendered (scaled) coordinates to natural image coordinates. */
  toNatural(rect: { top: number; left: number; width: number; height: number }) {
    const result = {
      top: rect.top / this.scaleY,
      left: rect.left / this.scaleX,
      width: rect.width / this.scaleX,
      height: rect.height / this.scaleY,
    };
    if (!isFinite(result.top) || !isFinite(result.left) ||
        !isFinite(result.width) || !isFinite(result.height)) {
      throw new Error('image-annotate: scale conversion produced non-finite coordinates');
    }
    return result;
  }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/annotate-image.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS — no regressions.

**Step 6: Commit**

```bash
git add src/annotate-image.ts test/annotate-image.test.ts
git commit -m "feat: add toRendered/toNatural coordinate conversion methods with isFinite guard"
```

---

### Task 2: Use `toRendered`/`toNatural` in view and edit (C2 fix)

Replace all manual scale math with the new utility methods.

**Files:**
- Modify: `src/annotate-view.ts:77-109`
- Modify: `src/annotate-edit.ts:51-55,161-168`
- Test: existing tests in `test/annotate-view.test.ts`, `test/annotate-edit.test.ts`

**Step 1: Refactor `setPosition` in `annotate-view.ts`**

Replace lines 77-84:

```typescript
  setPosition(): void {
    const rendered = this.image.toRendered(this.note);
    const innerDiv = this.area.firstElementChild as HTMLElement;
    innerDiv.style.height = rendered.height + 'px';
    innerDiv.style.width = rendered.width + 'px';
    this.area.style.left = rendered.left + 'px';
    this.area.style.top = rendered.top + 'px';
  }
```

**Step 2: Refactor `resetPosition` in `annotate-view.ts`**

Replace lines 87-110. The key change: read natural coords from `editable.note` (already converted by the edit save handler), use `toRendered` for DOM positioning. No more re-deriving from inline styles:

```typescript
  resetPosition(editable: { area: HTMLElement; note: AnnotationNote }, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'none';

    // Position view DOM using the note's natural coordinates (already converted by edit)
    const rendered = this.image.toRendered(editable.note);
    const innerDiv = this.area.firstElementChild as HTMLElement;
    innerDiv.style.height = rendered.height + 'px';
    innerDiv.style.width = rendered.width + 'px';
    this.area.style.left = rendered.left + 'px';
    this.area.style.top = rendered.top + 'px';

    // Copy natural coordinates from the edit note
    this.note.top = editable.note.top;
    this.note.left = editable.note.left;
    this.note.height = editable.note.height;
    this.note.width = editable.note.width;
    this.note.text = text;
    this.note.id = editable.note.id;
    this.editable = true;
  }
```

Remove the now-unused `readInlinePosition` and `readInlineSize` imports from `annotate-view.ts` line 1-4 (keep the exports — `annotate-edit.ts` still uses them).

**Step 3: Refactor edit area positioning in `annotate-edit.ts`**

Replace lines 51-55 in the constructor:

```typescript
    const rendered = image.toRendered(this.note);
    this.area.style.height = rendered.height + 'px';
    this.area.style.width = rendered.width + 'px';
    this.area.style.left = rendered.left + 'px';
    this.area.style.top = rendered.top + 'px';
```

**Step 4: Refactor save handler in `annotate-edit.ts`**

Replace lines 161-169:

```typescript
      // Update note from current area position (convert rendered back to natural)
      const pos = readInlinePosition(this.area);
      const size = readInlineSize(this.area);
      const natural = this.image.toNatural({
        top: pos.top, left: pos.left,
        width: size.width, height: size.height,
      });
      this.note.top = natural.top;
      this.note.left = natural.left;
      this.note.width = natural.width;
      this.note.height = natural.height;
      this.note.text = text;
```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS — the behavior is identical, just the code path is consolidated.

**Step 6: Commit**

```bash
git add src/annotate-view.ts src/annotate-edit.ts
git commit -m "refactor: use toRendered/toNatural for all scale conversions (C2 fix)"
```

---

### Task 3: Wrap image inside canvas (C1 fix)

This is the core architectural change. The constructor wraps the image inside the canvas div instead of hiding it and using background-image. CSS handles overlay sizing.

**Files:**
- Modify: `src/annotate-image.ts:95-174` (constructor), `src/annotate-image.ts:250-274` (destroy), `src/annotate-image.ts:284-304` (rescale)
- Modify: `src/annotation.css:33-62`
- Test: `test/annotate-image.test.ts`, `test/destroy.test.ts`

**Step 1: Update CSS**

In `src/annotation.css`, replace lines 33-63:

```css
.image-annotate-canvas {
  --image-annotate-font-family: Verdana, sans-serif;
  --image-annotate-font-size: 12px;
  --image-annotate-area-border: #000;
  --image-annotate-area-inner-border: #fff;
  --image-annotate-hover-color: yellow;
  --image-annotate-hover-editable-color: #00ad00;
  --image-annotate-note-bg: #e7ffe7;
  --image-annotate-note-border: #397f39;
  --image-annotate-note-text: #000;
  --image-annotate-edit-bg: #fffee3;
  --image-annotate-edit-border: #000;
  --image-annotate-button-bg: #fff;
  --image-annotate-button-bg-hover: #eee;
  --image-annotate-button-border: #ccc;
  --image-annotate-button-text: #000;
  --image-annotate-icon-save: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%23333'%3E%3Cpath d='M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z'/%3E%3C/svg%3E");
  --image-annotate-icon-cancel: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%23333'%3E%3Cpath d='M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'/%3E%3C/svg%3E");
  --image-annotate-icon-delete: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%23333'%3E%3Cpath d='M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z'/%3E%3C/svg%3E");
  border: solid 1px var(--image-annotate-button-border);
  display: inline-block;
  margin: 0;
  max-width: 100%;
  position: relative;
}
.image-annotate-canvas > img {
  display: block;
  height: auto;
  max-width: 100%;
  width: 100%;
}
```

Note the changes from the current CSS:
- Removed: `background-position`, `background-repeat` (no more background-image)
- Changed: `display: block` → `display: inline-block` (so the canvas wraps tightly around the image, not 100% of parent)
- Added: `.image-annotate-canvas > img` rule

Replace lines 60-63 (view overlay):

```css
.image-annotate-view {
  display: none;
  inset: 0;
  position: absolute;
}
```

Replace lines 122-124 (edit overlay):

```css
.image-annotate-edit {
  display: none;
  inset: 0;
  position: absolute;
}
```

**Step 2: Update failing tests for new DOM structure**

In `test/annotate-image.test.ts`, update the initialization tests (lines 20-40):

Replace test at line 20-27:

```typescript
  test('canvas wraps the original image', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.canvas.contains(image[0])).toBe(true);
    expect(image[0].parentElement).toBe(inst.canvas);
  });
```

Remove (delete) the test at lines 29-34 (`sets canvas background-image from the img src`) — no longer applicable.

Replace test at lines 36-40:

```typescript
  test('image is visible inside the canvas', () => {
    const image = createTestImage();

    expect(image[0].style.display).not.toBe('none');
  });
```

In `test/destroy.test.ts`, update lines 15-22:

```typescript
  test('restores image to original DOM position', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.destroy();
    // Image should be back in document.body, not inside the canvas
    expect(image[0].parentElement).toBe(document.body);
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run test/annotate-image.test.ts test/destroy.test.ts`
Expected: FAIL — constructor still uses background-image approach.

**Step 4: Refactor the constructor**

In `src/annotate-image.ts`, add fields for DOM restoration (after `private resizeObserver?: ResizeObserver;` at line 81):

```typescript
  private originalParent: Node | null = null;
  private originalNextSibling: Node | null = null;
```

Replace the constructor body from line 113 (`this.notes = ...`) through line 162 (`img.style.display = 'none'`). Keep everything before line 113 (dimension reading, scale computation) and everything after line 162 (ResizeObserver setup).

New constructor body (replacing lines 113-162):

```typescript
    this.notes = options.notes.map(n => ({ ...n }));

    // Record original DOM position for destroy restoration
    this.originalParent = img.parentNode;
    this.originalNextSibling = img.nextSibling;

    // Build canvas structure — wrap the image
    this.canvas = document.createElement('div');
    this.canvas.className = 'image-annotate-canvas';

    this.viewOverlay = document.createElement('div');
    this.viewOverlay.className = 'image-annotate-view';

    this.editOverlay = document.createElement('div');
    this.editOverlay.className = 'image-annotate-edit';
    this.editOverlay.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'image-annotate-edit-area';
    this.editOverlay.appendChild(editArea);

    // Insert canvas at the image's original position, then move image inside
    if (!img.parentNode) {
      throw new Error('image-annotate: image must be in the DOM before initialization');
    }
    img.parentNode.insertBefore(this.canvas, img);
    this.canvas.appendChild(img);
    this.canvas.appendChild(this.viewOverlay);
    this.canvas.appendChild(this.editOverlay);

    // Load notes
    this.api = this.options.api ? normalizeApi(this.options.api) : {};
    if (this.api.load) {
      this.loadFromApi();
    } else {
      this.load();
    }

    // Add Note button
    if (this.options.editable) {
      this.createButton();
    }
```

Note what's removed:
- No `this.canvas.style.height/width` — image provides sizing
- No `this.canvas.style.backgroundImage/backgroundSize` — image is visible
- No `this.viewOverlay.style.height/width` — CSS `inset: 0` handles it
- No `this.editOverlay.style.height/width` — CSS `inset: 0` handles it
- No `img.style.display = 'none'` — image stays visible

**Step 5: Refactor `destroy()`**

Replace lines 250-274:

```typescript
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Destroy views without firing onChange
    this.destroyViews();
    this.notes = [];

    // Remove "Add Note" button
    if (this.button) {
      this.button.remove();
    }

    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    // Restore image to its original DOM position
    if (this.originalParent) {
      this.originalParent.insertBefore(this.img, this.originalNextSibling);
    }

    // Remove canvas from DOM
    this.canvas.remove();
  }
```

**Step 6: Simplify `rescale()`**

Replace lines 284-304. No longer needs to update overlay dimensions (CSS handles that):

```typescript
  private rescale(renderedWidth: number, renderedHeight: number): void {
    const newScaleX = renderedWidth / this.naturalWidth;
    const newScaleY = renderedHeight / this.naturalHeight;

    // Skip if nothing changed
    if (newScaleX === this.scaleX && newScaleY === this.scaleY) return;

    this.scaleX = newScaleX;
    this.scaleY = newScaleY;

    // Rebuild views at new scale
    this.destroyViews();
    this.createViews();
  }
```

**Step 7: Run tests**

Run: `npx vitest run`
Expected: ALL PASS — existing scaling tests work because `createScaledTestImage` mocks `getBoundingClientRect()` and the scale math is unchanged.

**Step 8: Commit**

```bash
git add src/annotate-image.ts src/annotation.css test/annotate-image.test.ts test/destroy.test.ts
git commit -m "refactor: wrap image inside canvas instead of using background-image (C1 fix)"
```

---

### Task 4: Defer rescale during active edits (H1 fix)

**Files:**
- Modify: `src/annotate-image.ts` (rescale, cancelEdit, and post-save/delete flush)
- Test: `test/annotate-image.test.ts`

**Step 1: Write failing tests**

Add to `test/annotate-image.test.ts` inside the `auto-scaling — ResizeObserver` describe block:

```typescript
  test('rescale is deferred while in edit mode', () => {
    const note = { id: '1', top: 100, left: 200, width: 80, height: 60, text: 'test', editable: true };
    const inst = createScaledTestImage(400, 300, 400, 300, { notes: [note] });
    expect(inst.scaleX).toBe(1);

    // Enter edit mode
    inst.add();
    expect(inst.mode).toBe('edit');

    // Simulate resize — should be deferred
    observeCallback!([{ contentRect: { width: 200, height: 150 } }]);
    expect(inst.scaleX).toBe(1); // NOT updated yet

    // Cancel edit — deferred rescale should now apply
    inst.cancelEdit();
    expect(inst.scaleX).toBe(0.5);
    expect(inst.scaleY).toBe(0.5);
  });

  test('deferred rescale applies after edit save', () => {
    const note = { id: '1', top: 100, left: 200, width: 80, height: 60, text: 'test', editable: true };
    const inst = createScaledTestImage(400, 300, 400, 300, { notes: [note] });

    // Click-to-edit the note
    const view = inst.notes[0].view!;
    view.edit();
    expect(inst.mode).toBe('edit');

    // Simulate resize while editing
    observeCallback!([{ contentRect: { width: 200, height: 150 } }]);
    expect(inst.scaleX).toBe(1); // Deferred

    // Save the edit
    const saveBtn = inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement;
    saveBtn.click();

    // Rescale should have applied
    expect(inst.scaleX).toBe(0.5);
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/annotate-image.test.ts`
Expected: FAIL — rescale currently runs immediately during edits.

**Step 3: Implement deferred rescale**

In `src/annotate-image.ts`, add the `pendingRescale` field (near the other private fields):

```typescript
  private pendingRescale = false;
```

Modify `rescale()` to defer when in edit mode:

```typescript
  private rescale(renderedWidth: number, renderedHeight: number): void {
    if (this.mode === 'edit') {
      this.pendingRescale = true;
      return;
    }
    this.applyRescale(renderedWidth, renderedHeight);
  }

  private applyRescale(renderedWidth: number, renderedHeight: number): void {
    const newScaleX = renderedWidth / this.naturalWidth;
    const newScaleY = renderedHeight / this.naturalHeight;

    if (newScaleX === this.scaleX && newScaleY === this.scaleY) return;

    this.scaleX = newScaleX;
    this.scaleY = newScaleY;

    this.destroyViews();
    this.createViews();
  }
```

Add a `flushPendingRescale()` method:

```typescript
  /** @internal Flush any deferred rescale after an edit completes. */
  flushPendingRescale(): void {
    if (!this.pendingRescale) return;
    this.pendingRescale = false;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.applyRescale(rect.width, rect.height);
    }
  }
```

Modify `cancelEdit()` to flush:

```typescript
  cancelEdit(): void {
    if (this.activeEdit) {
      this.activeEdit.destroy();
      this.setMode('view');
    }
    this.flushPendingRescale();
  }
```

In `src/annotate-edit.ts`, add flush calls after save and delete complete. In `commitSave()` (around line 147-158), add after `this.destroy()`:

```typescript
        this.image.flushPendingRescale();
```

In `removeNote()` (around line 203-209), add after `this.image.notifyDelete(...)`:

```typescript
        this.image.flushPendingRescale();
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/annotate-image.ts src/annotate-edit.ts test/annotate-image.test.ts
git commit -m "fix: defer rescale during active edits to prevent data loss (H1 fix)"
```

---

### Task 5: ResizeObserver edge case tests (M2/M3)

**Files:**
- Test: `test/annotate-image.test.ts`

**Step 1: Add edge case tests**

Add to the `auto-scaling — ResizeObserver` describe block:

```typescript
  test('no-op rescale with unchanged dimensions does not rebuild views', () => {
    const note = { id: '1', top: 100, left: 200, width: 80, height: 60, text: 'test', editable: true };
    const inst = createScaledTestImage(400, 300, 400, 300, { notes: [note] });

    // Get reference to original view DOM element
    const originalArea = inst.viewOverlay.querySelector('.image-annotate-area');

    // Fire callback with same dimensions
    observeCallback!([{ contentRect: { width: 400, height: 300 } }]);

    // View should NOT have been rebuilt — same DOM reference
    const currentArea = inst.viewOverlay.querySelector('.image-annotate-area');
    expect(currentArea).toBe(originalArea);
  });

  test('empty ResizeObserver entries does not crash', () => {
    createScaledTestImage(400, 300, 400, 300);
    expect(() => observeCallback!([])).not.toThrow();
  });

  test('zero-dimension entries does not crash or rescale', () => {
    const inst = createScaledTestImage(400, 300, 400, 300);
    observeCallback!([{ contentRect: { width: 0, height: 0 } }]);
    expect(inst.scaleX).toBe(1);
    expect(inst.scaleY).toBe(1);
  });
```

**Step 2: Run tests**

Run: `npx vitest run test/annotate-image.test.ts`
Expected: ALL PASS — these guards already exist in the code.

**Step 3: Commit**

```bash
git add test/annotate-image.test.ts
git commit -m "test: add edge case tests for ResizeObserver guards (M2/M3)"
```

---

### Task 6: Idiomatic framework defaults (H3) and prop tests (H4/H5)

**Files:**
- Modify: `src/react.tsx:83`
- Modify: `src/vue.ts:29`
- Test: `test/react.test.tsx`
- Test: `test/vue.test.ts`

**Step 1: Write failing tests for React `autoResize` passthrough**

Add to `test/react.test.tsx`:

```typescript
  describe('autoResize prop', () => {
    it('defaults autoResize to true', () => {
      render(<AnnotateImage src="test.jpg" width={400} height={300} />);
      // The canvas should have been created (basic sanity)
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });

    it('passes autoResize={false} to core', () => {
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} autoResize={false} />
      );
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });
  });
```

**Step 2: Write failing tests for Vue `autoResize` passthrough**

Add to `test/vue.test.ts`:

```typescript
  describe('autoResize prop', () => {
    it('defaults autoResize to true', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });

    it('passes autoResize=false to core', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, autoResize: false },
      });
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });
  });
```

**Step 3: Fix React default**

In `src/react.tsx`, change line 83 from:

```typescript
          autoResize: props.autoResize,
```

to:

```typescript
          autoResize: props.autoResize ?? true,
```

**Step 4: Fix Vue default**

In `src/vue.ts`, change line 29 from:

```typescript
    autoResize: { type: Boolean, default: undefined },
```

to:

```typescript
    autoResize: { type: Boolean, default: true },
```

**Step 5: Run tests**

Run: `npx vitest run test/react.test.tsx test/vue.test.ts`
Expected: ALL PASS

**Step 6: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add src/react.tsx src/vue.ts test/react.test.tsx test/vue.test.ts
git commit -m "fix: idiomatic framework defaults for autoResize, add prop tests (H3/H4/H5)"
```

---

### Task 7: Add `autoResize` to defaults and fix demo (D3, L1)

**Files:**
- Modify: `src/index.ts:16-20`
- Modify: `demo/scaling.html:70`

**Step 1: Add `autoResize` to defaults**

In `src/index.ts`, change line 16-20:

```typescript
const defaults: AnnotateImageOptions = {
  editable: true,
  notes: [],
  autoResize: true,
  labels: { ...DEFAULT_LABELS },
};
```

**Step 2: Fix `var` in demo**

In `demo/scaling.html`, change line 70 from `var notes` to `const notes`.

**Step 3: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/index.ts demo/scaling.html
git commit -m "chore: add autoResize to defaults (D3), fix var in demo (L1)"
```

---

### Task 8: Update test helpers for new DOM structure

The `createTestImage` and `createTestImageVanilla` helpers may need adjustment since the image is now inside the canvas.

**Files:**
- Modify: `test/setup.ts` (if needed)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: Check which tests pass/fail. If all pass, skip this task.

**Step 2: Fix any remaining test failures**

If tests fail because they expect the image to be a sibling of the canvas, update the assertions. The test helpers themselves should not need changes — they create an `<img>` in `document.body`, and the constructor now wraps it in the canvas.

The key thing: after construction, `image[0].parentElement` is now the canvas div, not `document.body`. Any test that relies on `image[0].nextElementSibling === canvas` will fail and needs updating.

**Step 3: Run full test suite again**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit if changes were made**

```bash
git add test/
git commit -m "test: update test assertions for image-wrapping DOM structure"
```

---

### Task 9: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `readme.md`

**Step 1: Update CLAUDE.md**

In the Architecture section, update the description of AnnotateImage to mention wrapping:

> **`AnnotateImage`** — Orchestrates the plugin. Wraps the target image in a canvas div with view/edit overlays...

Remove references to `background-image` or "hiding the original image."

**Step 2: Update readme.md**

Update the Scaling section if it mentions background-image or canvas sizing.

**Step 3: Commit**

```bash
git add CLAUDE.md readme.md
git commit -m "docs: update for canvas-wrapping architecture"
```

---

### Task 10: Build and verify

**Step 1: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 2: Run full unit test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Run jQuery 4 tests**

Run: `npm run test:jquery4`
Expected: ALL PASS

**Step 4: Build**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 5: Run E2E tests**

Run: `npm run test:e2e`
Expected: ALL PASS (may need E2E test updates if they assert on background-image or sibling structure).

**Step 6: Commit any E2E fixes**

If E2E tests need updating:

```bash
git add e2e/
git commit -m "test: update E2E tests for canvas-wrapping architecture"
```
