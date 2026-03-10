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
