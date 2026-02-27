# Code Review Fixes — Design

Fixes for all issues identified in the v2-beta-2 branch review.

## C1: Wrap image instead of replacing it

### Problem

The constructor hides the image (`display: none`) and creates a sibling canvas div with `background-image`. The canvas gets fixed inline `style.width/height` matching the image's rendered size at init time. This means:

- The canvas **can never grow** beyond its initial rendered width (inline style caps it, even though CSS `max-width: 100%` allows shrinking)
- The `backgroundImage` URL is built via string concatenation without escaping
- Developers can't apply CSS to the canvas the way they'd expect — it doesn't behave like the image it replaced

### Design

**Wrap the image inside the canvas div** instead of hiding it and using `background-image`.

#### Constructor changes

Before:
```
[img] → insertAfter → [canvas(bg-image)][img(hidden)]
```

After:
```
[img] → wrap → [canvas > img + viewOverlay + editOverlay]
```

Steps:
1. Record `img.parentNode` and `img.nextSibling` for insertion
2. Create the canvas div
3. Insert canvas at the image's original position
4. Move the image inside the canvas as first child
5. Append viewOverlay and editOverlay after the image
6. Style the image: `display: block; width: 100%; height: auto;` so it fills and sizes the canvas
7. Do NOT set inline `width`/`height` on the canvas — let the image provide intrinsic sizing
8. Do NOT set `backgroundImage`/`backgroundSize` on the canvas
9. Read rendered dimensions from the canvas (after insertion) via `getBoundingClientRect()` for scale factor computation

#### CSS changes

Remove from `.image-annotate-canvas`:
- `background-position: left top`
- `background-repeat: no-repeat`

Add:
```css
.image-annotate-canvas > img {
  display: block;
  width: 100%;
  height: auto;
}
```

Change overlays to fill canvas without inline dimensions:
```css
.image-annotate-view,
.image-annotate-edit {
  position: absolute;
  inset: 0;
}
```

Remove inline `style.width`/`style.height` from viewOverlay and editOverlay in the constructor.

#### Destroy changes

Before: remove canvas, set `img.style.display = ''`.

After:
1. Extract image from canvas, restore to original DOM position (before canvas)
2. Remove canvas
3. Clear any styles the plugin added to the image

Store `originalNextSibling` and `originalParent` at construction time for restoration.

#### ResizeObserver changes

Still observes the canvas. The canvas now sizes itself from its image child, so it naturally responds to CSS layout changes. No inline dimensions to fight with. No feedback loop risk.

`rescale()` no longer needs to update canvas or overlay dimensions — the CSS handles it. It only needs to:
1. Read new canvas dimensions via `getBoundingClientRect()`
2. Recompute scale factors
3. Rebuild annotation views

#### What doesn't change

- `interactions.ts` — drag/resize uses `getBoundingClientRect()` on the containment element, position-agnostic
- `jquery.annotate.ts` — passes raw `<img>` to constructor, agnostic to DOM structure
- `src/react.tsx`, `src/vue.ts` — return `<img>`, plugin handles DOM internally
- Annotation data model — still natural-pixel coordinates

## C2: Consolidate coordinate conversion

### Problem

The rendered-to-natural conversion (`value / scale`) is duplicated in `annotate-edit.ts` (save handler) and `annotate-view.ts` (`resetPosition`). Both read the same inline styles and apply the same math to the same note object.

### Design

Add two utility methods to `AnnotateImage`:

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
  return {
    top: rect.top / this.scaleY,
    left: rect.left / this.scaleX,
    width: rect.width / this.scaleX,
    height: rect.height / this.scaleY,
  };
}
```

Then:
- **`annotate-edit.ts` save handler**: Convert rendered area position to natural via `this.image.toNatural(...)`, set on `this.note`
- **`annotate-view.ts` `resetPosition`**: Read natural coords from `editable.note` (already converted by edit), convert to rendered via `this.image.toRendered(...)` for DOM positioning. No independent re-derivation from inline styles.
- **`annotate-view.ts` `setPosition`**: Use `this.image.toRendered(this.note)` for DOM positioning
- **`annotate-edit.ts` constructor**: Use `this.image.toRendered(this.note)` for initial area positioning

Single source of truth for all scale conversions.

## H1: Defer rescale during active edits

### Problem

`rescale()` calls `destroyViews()` which calls `cancelEdit()`, silently discarding the user's in-progress text and position changes. This fires on any container resize, including mobile keyboard show/hide.

### Design

In `rescale()`, if `this.mode === 'edit'`, set a `pendingRescale` flag and return without rescaling. When the edit completes (save, delete, or cancel), check the flag and rescale then.

```typescript
private pendingRescale = false;

private rescale(renderedWidth: number, renderedHeight: number): void {
  // Defer if user is mid-edit
  if (this.mode === 'edit') {
    this.pendingRescale = true;
    return;
  }
  this.applyRescale(renderedWidth, renderedHeight);
}
```

In `cancelEdit()` and after save/delete complete, check and flush:

```typescript
cancelEdit(): void {
  if (this.activeEdit) {
    this.activeEdit.destroy();
    this.setMode('view');
  }
  if (this.pendingRescale) {
    this.pendingRescale = false;
    const rect = this.canvas.getBoundingClientRect();
    this.applyRescale(rect.width, rect.height);
  }
}
```

## H2: Defense-in-depth `isFinite` guards

### Problem

Division by `scaleX`/`scaleY` could theoretically produce `Infinity` if scale factors are zero, corrupting stored coordinates.

### Design

Add guards in `toNatural()`:

```typescript
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

The edit save handler already has error reporting — the thrown error will be caught there.

## H3: Idiomatic framework defaults

### Problem

Vue uses `default: undefined` for a Boolean prop (non-idiomatic). React passes `undefined` without applying a default (requires reading core source to understand behavior).

### Design

- **Vue**: `autoResize: { type: Boolean, default: true }`
- **React**: `autoResize: props.autoResize ?? true` in the options object passed to core

## H4/H5: Framework prop passthrough tests

### Design

Add tests in both `test/react.test.tsx` and `test/vue.test.ts`:

1. Default behavior — no `autoResize` prop → instance created with `autoResize: true`
2. Explicit `autoResize={false}` → forwarded correctly, no ResizeObserver attached

Follow the existing pattern used for `editable` prop tests.

## M2/M3: Edge case tests for rescale

### Design

Bundle into the C1 refactor. When writing tests for the new canvas-wrapping implementation, include:

1. No-op path — rescale with unchanged dimensions doesn't rebuild views
2. Empty ResizeObserver entries — no crash
3. Zero-dimension entries — no crash, no rescale
4. Deferred rescale during edit (H1) — rescale fires after edit completes

## L1: `var` → `const` in demo

Change `var notes` to `const notes` in `demo/scaling.html`.

## D3: `autoResize` in defaults

Add `autoResize: true` to the defaults object in `src/index.ts` for self-documentation.
