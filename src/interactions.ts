import type { DragCallbacks, ResizeCallbacks, InteractionHandlers } from './types';

const dragCleanups = new WeakMap<HTMLElement, () => void>();
const resizeCleanups = new WeakMap<HTMLElement, () => void>();

export function makeDraggable(el: HTMLElement, opts: DragCallbacks): void {
  // Clean up any existing drag on this element
  destroyDraggable(el);

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = parseFloat(el.style.left) || 0;
    const startTop = parseFloat(el.style.top) || 0;

    // Compute element dimensions from inline style or offsetWidth
    const elWidth = parseFloat(el.style.width) || el.offsetWidth;
    const elHeight = parseFloat(el.style.height) || el.offsetHeight;

    // Compute containment bounds at drag start
    let minLeft = -Infinity;
    let minTop = -Infinity;
    let maxLeft = Infinity;
    let maxTop = Infinity;

    if (opts.containment) {
      const containerRect = opts.containment.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // The offset between the element's CSS left/top and its bounding rect position
      // accounts for the container's own position
      const offsetX = startLeft - (elRect.left - containerRect.left);
      const offsetY = startTop - (elRect.top - containerRect.top);

      minLeft = offsetX;
      minTop = offsetY;
      maxLeft = containerRect.width - elWidth + offsetX;
      maxTop = containerRect.height - elHeight + offsetY;
    }

    function clamp(value: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, value));
    }

    function onPointerMove(e: PointerEvent): void {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = clamp(startLeft + dx, minLeft, maxLeft);
      const newTop = clamp(startTop + dy, minTop, maxTop);

      if (opts.onDrag) {
        opts.onDrag({ left: newLeft, top: newTop });
      }
    }

    function onPointerUp(e: PointerEvent): void {
      if (el.releasePointerCapture) el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const finalLeft = clamp(startLeft + dx, minLeft, maxLeft);
      const finalTop = clamp(startTop + dy, minTop, maxTop);

      if (opts.onStop) {
        opts.onStop({ left: finalLeft, top: finalTop });
      }
    }

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
  }

  el.addEventListener('pointerdown', onPointerDown);

  dragCleanups.set(el, () => {
    el.removeEventListener('pointerdown', onPointerDown);
  });
}

export function destroyDraggable(el: HTMLElement): void {
  const cleanup = dragCleanups.get(el);
  if (cleanup) {
    cleanup();
    dragCleanups.delete(el);
  }
}

const MIN_SIZE = 10;
type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

function computeResize(
  corner: Corner,
  startLeft: number,
  startTop: number,
  startWidth: number,
  startHeight: number,
  dx: number,
  dy: number,
): { left: number; top: number; width: number; height: number } {
  let left = startLeft,
    top = startTop,
    width = startWidth,
    height = startHeight;

  if (corner === 'nw' || corner === 'sw') {
    left = startLeft + dx;
    width = startWidth - dx;
  } else {
    width = startWidth + dx;
  }

  if (corner === 'nw' || corner === 'ne') {
    top = startTop + dy;
    height = startHeight - dy;
  } else {
    height = startHeight + dy;
  }

  if (width < MIN_SIZE) {
    if (corner === 'nw' || corner === 'sw') left = startLeft + startWidth - MIN_SIZE;
    width = MIN_SIZE;
  }
  if (height < MIN_SIZE) {
    if (corner === 'nw' || corner === 'ne') top = startTop + startHeight - MIN_SIZE;
    height = MIN_SIZE;
  }

  return { left, top, width, height };
}

export function makeResizable(el: HTMLElement, opts: ResizeCallbacks): void {
  // Clean up any existing resize on this element
  destroyResizable(el);

  const handles: HTMLElement[] = [];

  for (const corner of CORNERS) {
    const handle = document.createElement('div');
    handle.className = `image-annotate-resize-handle image-annotate-resize-handle-${corner}`;
    el.appendChild(handle);
    handles.push(handle);

    handle.addEventListener('pointerdown', function onPointerDown(e: PointerEvent): void {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(el.style.left) || 0;
      const startTop = parseFloat(el.style.top) || 0;
      const startWidth = parseFloat(el.style.width) || 0;
      const startHeight = parseFloat(el.style.height) || 0;

      // Compute containment bounds at resize start
      let maxRight = Infinity;
      let maxBottom = Infinity;
      let minLeft = -Infinity;
      let minTop = -Infinity;

      if (opts.containment) {
        const containerRect = opts.containment.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offsetX = startLeft - (elRect.left - containerRect.left);
        const offsetY = startTop - (elRect.top - containerRect.top);

        minLeft = offsetX;
        minTop = offsetY;
        maxRight = containerRect.width + offsetX;
        maxBottom = containerRect.height + offsetY;
      }

      function clampRect(rect: { left: number; top: number; width: number; height: number }) {
        let { left, top, width, height } = rect;
        if (left < minLeft) {
          width -= minLeft - left;
          left = minLeft;
        }
        if (top < minTop) {
          height -= minTop - top;
          top = minTop;
        }
        if (left + width > maxRight) {
          width = maxRight - left;
        }
        if (top + height > maxBottom) {
          height = maxBottom - top;
        }
        if (width < MIN_SIZE) width = MIN_SIZE;
        if (height < MIN_SIZE) height = MIN_SIZE;
        return { left, top, width, height };
      }

      function onPointerMove(e: PointerEvent): void {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const rect = clampRect(computeResize(corner, startLeft, startTop, startWidth, startHeight, dx, dy));
        opts.onResize?.(rect);
      }

      function onPointerUp(e: PointerEvent): void {
        if (handle.releasePointerCapture) handle.releasePointerCapture(e.pointerId);
        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', onPointerUp);

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const rect = clampRect(computeResize(corner, startLeft, startTop, startWidth, startHeight, dx, dy));

        if (opts.onStop) {
          opts.onStop(rect);
        }
      }

      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
    });
  }

  resizeCleanups.set(el, () => {
    for (const handle of handles) {
      handle.remove();
    }
  });
}

export function destroyResizable(el: HTMLElement): void {
  const cleanup = resizeCleanups.get(el);
  if (cleanup) {
    cleanup();
    resizeCleanups.delete(el);
  }
}

/** Returns an InteractionHandlers object using vanilla pointer events. */
export function createDefaultHandlers(): InteractionHandlers {
  return {
    makeDraggable,
    makeResizable,
    destroyDraggable,
    destroyResizable,
  };
}
