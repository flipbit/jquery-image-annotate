import { describe, test, expect, vi } from 'vitest';
import { makeDraggable, destroyDraggable, makeResizable, destroyResizable } from '../src/interactions.ts';

/**
 * Creates a container (400x300) and a positioned child element (30x30 at left:50, top:50)
 * with stubbed getBoundingClientRect on both.
 */
function createDragSetup(): { container: HTMLDivElement; el: HTMLDivElement } {
  const container = document.createElement('div');
  container.style.width = '400px';
  container.style.height = '300px';
  container.style.position = 'relative';
  container.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    toJSON() {},
  });
  document.body.appendChild(container);

  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = '50px';
  el.style.top = '50px';
  el.style.width = '30px';
  el.style.height = '30px';
  el.getBoundingClientRect = () => ({
    x: 50,
    y: 50,
    top: 50,
    left: 50,
    width: 30,
    height: 30,
    right: 80,
    bottom: 80,
    toJSON() {},
  });
  container.appendChild(el);

  return { container, el };
}

function pointerDown(el: HTMLElement, clientX: number, clientY: number): void {
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX,
      clientY,
      button: 0,
      bubbles: true,
    }),
  );
}

function pointerMove(el: HTMLElement, clientX: number, clientY: number): void {
  el.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX,
      clientY,
      bubbles: true,
    }),
  );
}

function pointerUp(el: HTMLElement, clientX: number, clientY: number): void {
  el.dispatchEvent(
    new PointerEvent('pointerup', {
      clientX,
      clientY,
      bubbles: true,
    }),
  );
}

describe('makeDraggable', () => {
  test('fires onDrag with updated position on pointermove', () => {
    const { container, el } = createDragSetup();
    const onDrag = vi.fn();

    makeDraggable(el, { containment: container, onDrag });

    pointerDown(el, 60, 60);
    pointerMove(el, 70, 80);

    expect(onDrag).toHaveBeenCalledWith({ left: 60, top: 70 });
  });

  test('fires onStop with final position on pointerup', () => {
    const { container, el } = createDragSetup();
    const onStop = vi.fn();

    makeDraggable(el, { containment: container, onStop });

    pointerDown(el, 60, 60);
    pointerMove(el, 70, 80);
    pointerUp(el, 70, 80);

    expect(onStop).toHaveBeenCalledWith({ left: 60, top: 70 });
  });

  test('clamps position to containment element bounds', () => {
    const { container, el } = createDragSetup();
    const onDrag = vi.fn();

    makeDraggable(el, { containment: container, onDrag });

    pointerDown(el, 60, 60);
    pointerMove(el, 500, 500);

    expect(onDrag).toHaveBeenCalled();
    const pos = onDrag.mock.calls[0][0];
    expect(pos.left).toBeLessThanOrEqual(370); // 400 - 30
    expect(pos.top).toBeLessThanOrEqual(270); // 300 - 30
  });

  test('clamps position to not go negative', () => {
    const { container, el } = createDragSetup();
    const onDrag = vi.fn();

    makeDraggable(el, { containment: container, onDrag });

    pointerDown(el, 60, 60);
    pointerMove(el, -100, -100);

    expect(onDrag).toHaveBeenCalled();
    const pos = onDrag.mock.calls[0][0];
    expect(pos.left).toBeGreaterThanOrEqual(0);
    expect(pos.top).toBeGreaterThanOrEqual(0);
  });

  test('destroyDraggable removes listeners', () => {
    const { container, el } = createDragSetup();
    const onDrag = vi.fn();

    makeDraggable(el, { containment: container, onDrag });
    destroyDraggable(el);

    pointerDown(el, 60, 60);
    pointerMove(el, 70, 80);

    expect(onDrag).not.toHaveBeenCalled();
  });
});

/**
 * Creates a container and a positioned child element (100x80 at left:50, top:50)
 * for resize tests.
 */
function createResizeSetup(): { container: HTMLDivElement; el: HTMLDivElement } {
  const container = document.createElement('div');
  container.style.width = '400px';
  container.style.height = '300px';
  container.style.position = 'relative';
  document.body.appendChild(container);

  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = '50px';
  el.style.top = '50px';
  el.style.width = '100px';
  el.style.height = '80px';
  container.appendChild(el);

  return { container, el };
}

/**
 * Creates a container (400x300) and a positioned child element (100x80 at left:50, top:50)
 * with stubbed getBoundingClientRect on both, for resize containment tests.
 */
function createResizeSetupWithContainment(): { container: HTMLDivElement; el: HTMLDivElement } {
  const container = document.createElement('div');
  container.style.width = '400px';
  container.style.height = '300px';
  container.style.position = 'relative';
  container.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    toJSON() {},
  });
  document.body.appendChild(container);

  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = '50px';
  el.style.top = '50px';
  el.style.width = '100px';
  el.style.height = '80px';
  el.getBoundingClientRect = () => ({
    x: 50,
    y: 50,
    top: 50,
    left: 50,
    width: 100,
    height: 80,
    right: 150,
    bottom: 130,
    toJSON() {},
  });
  container.appendChild(el);

  return { container, el };
}

describe('makeResizable', () => {
  test('creates 4 corner handle elements', () => {
    const { el } = createResizeSetup();

    makeResizable(el, {});

    const handles = el.querySelectorAll('.image-annotate-resize-handle');
    expect(handles.length).toBe(4);
  });

  test('fires onResize with current rect during pointermove', () => {
    const { el } = createResizeSetup();
    const onResize = vi.fn();

    makeResizable(el, { onResize });

    const handle = el.querySelector('.image-annotate-resize-handle-se');
    pointerDown(handle, 150, 130);
    pointerMove(handle, 170, 150);

    expect(onResize).toHaveBeenCalledWith({ left: 50, top: 50, width: 120, height: 100 });
  });

  test('SE corner resize increases width and height', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-se');
    pointerDown(handle, 150, 130);
    pointerMove(handle, 170, 150);
    pointerUp(handle, 170, 150);

    expect(onStop).toHaveBeenCalledWith({ left: 50, top: 50, width: 120, height: 100 });
  });

  test('NW corner resize shifts origin and shrinks', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-nw');
    pointerDown(handle, 50, 50);
    pointerMove(handle, 60, 60);
    pointerUp(handle, 60, 60);

    expect(onStop).toHaveBeenCalledWith({ left: 60, top: 60, width: 90, height: 70 });
  });

  test('enforces minimum size of 10x10', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-nw');
    pointerDown(handle, 50, 50);
    pointerMove(handle, 250, 250);
    pointerUp(handle, 250, 250);

    expect(onStop).toHaveBeenCalled();
    const rect = onStop.mock.calls[0][0];
    expect(rect.width).toBeGreaterThanOrEqual(10);
    expect(rect.height).toBeGreaterThanOrEqual(10);
  });

  test('destroyResizable removes handles and listeners', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });
    destroyResizable(el);

    const handles = el.querySelectorAll('.image-annotate-resize-handle');
    expect(handles.length).toBe(0);

    // No callbacks should fire after destroy
    pointerDown(el, 150, 130);
    pointerMove(el, 170, 150);
    pointerUp(el, 170, 150);
    expect(onStop).not.toHaveBeenCalled();
  });

  test('NE corner resize increases width and shifts origin upward', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-ne');
    pointerDown(handle, 150, 50);
    pointerMove(handle, 170, 40);
    pointerUp(handle, 170, 40);

    expect(onStop).toHaveBeenCalledWith({ left: 50, top: 40, width: 120, height: 90 });
  });

  test('SW corner resize shifts origin leftward and increases height', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-sw');
    pointerDown(handle, 50, 130);
    pointerMove(handle, 40, 150);
    pointerUp(handle, 40, 150);

    expect(onStop).toHaveBeenCalledWith({ left: 40, top: 50, width: 110, height: 100 });
  });

  test('SE resize is clamped to container bounds', () => {
    const { container, el } = createResizeSetupWithContainment();
    const onStop = vi.fn();

    makeResizable(el, { containment: container, onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-se');
    pointerDown(handle, 150, 130);
    pointerUp(handle, 600, 600);

    expect(onStop).toHaveBeenCalled();
    const rect = onStop.mock.calls[0][0];
    expect(rect.left + rect.width).toBeLessThanOrEqual(400);
    expect(rect.top + rect.height).toBeLessThanOrEqual(300);
  });

  test('NW resize is clamped to container bounds', () => {
    const { container, el } = createResizeSetupWithContainment();
    const onStop = vi.fn();

    makeResizable(el, { containment: container, onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-nw');
    pointerDown(handle, 50, 50);
    pointerUp(handle, -100, -100);

    expect(onStop).toHaveBeenCalled();
    const rect = onStop.mock.calls[0][0];
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  });

  test('resize without containment is unclamped', () => {
    const { el } = createResizeSetup();
    const onStop = vi.fn();

    makeResizable(el, { onStop });

    const handle = el.querySelector('.image-annotate-resize-handle-se');
    pointerDown(handle, 150, 130);
    pointerUp(handle, 600, 600);

    expect(onStop).toHaveBeenCalled();
    const rect = onStop.mock.calls[0][0];
    expect(rect.width).toBe(550);
    expect(rect.height).toBe(550);
  });
});
