# Note Positioning & Z-Index Design

## Problem

Two visual issues with annotation notes:

1. **Z-index overlap**: When a note tooltip is displayed on hover, it can render behind another annotation's outline. No z-index management exists for individual annotation areas.

2. **Poor note sizing/positioning**: Notes and edit forms are positioned at `left: -1px` relative to their annotation area with `max-width: 200px`. When an annotation area is narrow but the note text is long, the tooltip renders as a tall narrow column that's hard to read. The edit form has a similar issue.

## Design

### Z-Index on Hover

Add `z-index: 1` to the existing `.image-annotate-area-hover` and `.image-annotate-area-editable-hover` CSS rules. No new class needed — the existing hover classes already toggle on `show()`/`hide()`, so z-index piggybacks on them.

### Smart Note Positioning

A pure function handles horizontal positioning for both view tooltips and edit forms:

```typescript
computeNoteLeft(noteWidth: number, areaLeftInViewport: number, areaWidth: number, viewportWidth: number): number
```

**Coordinate system:** Uses browser viewport coordinates (via `getBoundingClientRect()` and `window.innerWidth`), not canvas-relative coordinates. Notes are allowed to overflow the image canvas — the constraint is the browser viewport.

**Algorithm:**
1. Calculate centered position: `centeredLeft = (areaWidth - noteWidth) / 2`
2. Convert to viewport coords: `noteLeftViewport = areaLeftInViewport + centeredLeft`
3. Clamp right edge: if `noteLeftViewport + noteWidth > viewportWidth`, shift left
4. Clamp left edge: if `noteLeftViewport < 0`, shift right
5. Return adjusted `left` value relative to the area element

This function lives in `src/positioning.ts`. esbuild picks it up automatically via imports — no build config changes needed.

**Call sites:**
- `AnnotateView.show()` — when tooltip appears on hover
- `AnnotateView.resetPosition()` — when annotation is updated after save
- `AnnotateEdit` — when edit form is created

**Measurement approach:** Render note/form with `visibility: hidden`, measure width via `getBoundingClientRect()`, compute position, set inline `left`, then switch to `visibility: visible`. For the edit form, `textarea.focus()` must be called *after* visibility is restored (browsers may not focus hidden elements).

### CSS Changes

- Replace `left: -1px` with `left: 0` on `.image-annotate-note` and `.image-annotate-edit-form` (fallback before JS positioning runs)
- `.image-annotate-note`: add `width: max-content; max-width: var(--image-annotate-note-max-width, 300px)`
- `.image-annotate-edit-form`: add `max-width: var(--image-annotate-edit-max-width, 300px)` (keeps existing `min-width: 250px; width: max-content`)
- Add `z-index: 1` to existing `.image-annotate-area-hover` and `.image-annotate-area-editable-hover` rules
- Vertical positioning (`top: calc(100% + 7px)`) unchanged

### CSS Custom Properties

Two new variables on `.image-annotate-canvas`:
- `--image-annotate-note-max-width` (default: `300px`) — max width of view tooltips
- `--image-annotate-edit-max-width` (default: `300px`) — max width of edit forms

### Demo/Documentation Updates

- Update `demo/themes.html` to showcase both new CSS custom properties
- Update `README.md` CSS variable reference if it lists variables

## Testing Strategy

- **Pure function unit tests**: centering, right-edge clamping, left-edge clamping, note wider than viewport, area wider than note (no expansion needed). No DOM required.
- **Z-index tests**: verify `z-index` is set when hover classes are applied (CSS rule test or inline style check). In `annotate-view.test.ts`.
- **Integration tests**: verify `show()`, `resetPosition()`, and edit mode set inline `left` style on the note/form element.
