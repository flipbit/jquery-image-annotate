# Note Positioning & Z-Index Design

## Problem

Two visual issues with annotation notes:

1. **Z-index overlap**: When a note tooltip is displayed on hover, it can render behind another annotation's outline. No z-index management exists for individual annotation areas.

2. **Poor note sizing/positioning**: Notes and edit forms are positioned at `left: -1px` relative to their annotation area with `max-width: 200px`. When an annotation area is narrow but the note text is long, the tooltip renders as a tall narrow column that's hard to read. The edit form has a similar issue.

## Design

### Z-Index on Hover

When `show()` is called on an AnnotateView, add `.image-annotate-area-active` to the area element, which sets `z-index: 1`. On `hide()`, remove it. This ensures the hovered annotation and its tooltip render above all sibling areas.

### Smart Note Positioning

A pure function handles horizontal positioning for both view tooltips and edit forms:

```typescript
computeNoteLeft(noteWidth: number, areaLeftInViewport: number, areaWidth: number, viewportWidth: number): number
```

**Algorithm:**
1. Calculate centered position: `centeredLeft = (areaWidth - noteWidth) / 2`
2. Convert to viewport coords: `noteLeftViewport = areaLeftInViewport + centeredLeft`
3. Clamp right edge: if `noteLeftViewport + noteWidth > viewportWidth`, shift left
4. Clamp left edge: if `noteLeftViewport < 0`, shift right
5. Return adjusted `left` value relative to the area element

This function lives in `src/positioning.ts`. Both `AnnotateView.show()` and `AnnotateEdit` call it after the note/form is rendered to set the inline `left` style.

**Measurement approach:** Render note/form with `visibility: hidden`, measure width via `getBoundingClientRect()`, compute position, set `left`, then make visible. Avoids visual flash.

### CSS Changes

- Remove `left: -1px` from `.image-annotate-note` and `.image-annotate-edit-form`
- `.image-annotate-note`: add `width: max-content; max-width: var(--image-annotate-note-max-width, 300px)`
- `.image-annotate-edit-form`: add `max-width: var(--image-annotate-edit-max-width, 300px)` (keeps existing `min-width: 250px; width: max-content`)
- New class `.image-annotate-area-active` with `z-index: 1`
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
- **Z-index tests**: verify `.image-annotate-area-active` added on `show()`, removed on `hide()`. In `annotate-view.test.ts`.
- **Integration tests**: verify `show()` and edit mode set inline `left` style on the note/form element.
