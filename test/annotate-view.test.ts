import { describe, test, expect } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';
import type { AnnotationNote } from '../src/types.ts';

function createImageWithNote(noteOverrides: Partial<AnnotationNote> = {}) {
  const note = {
    top: 50,
    left: 100,
    width: 80,
    height: 60,
    text: 'Test note',
    id: '1',
    editable: false,
    ...noteOverrides,
  };
  const image = createTestImage({ notes: [note] });
  const inst = getInstance(image);
  return { image, inst, view: inst.notes[0].view, note: inst.notes[0] };
}

describe('annotateView — rendering', () => {
  test('creates an area element in the view container', () => {
    const { inst } = createImageWithNote();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
  });

  test('creates a note text element in the view container', () => {
    const { inst } = createImageWithNote();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(1);
  });

  test('note text element contains the annotation text', () => {
    const { inst } = createImageWithNote({ text: 'Hello world' });
    const noteEl = inst.canvas.querySelector('.image-annotate-note');

    expect(noteEl.textContent).toBe('Hello world');
  });

  test('note text element is initially hidden', () => {
    const { view } = createImageWithNote();

    expect(view.tooltip.style.display).toBe('none');
  });
});

describe('annotateView — positioning', () => {
  test('area is positioned with CSS left and top from note data', () => {
    const { view } = createImageWithNote({ top: 50, left: 100 });

    expect(view.area.style.left).toBe('100px');
    expect(view.area.style.top).toBe('50px');
  });

  test('area inner div dimensions match note dimensions (border-box handles border)', () => {
    const { view } = createImageWithNote({ width: 80, height: 60 });
    const innerDiv = view.area.firstElementChild;

    expect(innerDiv.style.height).toBe('60px');
    expect(innerDiv.style.width).toBe('80px');
  });

  test('tooltip has no inline positioning (CSS handles it)', () => {
    const { view } = createImageWithNote({ top: 50, left: 100, height: 60 });

    expect(view.tooltip.style.top).toBe('');
    expect(view.tooltip.style.left).toBe('');
  });

  test('resetPosition produces same inner div dimensions as setPosition for same note size', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Original', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);
    const view = inst.notes[0].view;
    const innerDiv = view.area.firstElementChild as HTMLElement;

    // Record dimensions from initial setPosition render
    const initialWidth = innerDiv.style.width;
    const initialHeight = innerDiv.style.height;

    // Edit and save (non-AJAX) to trigger resetPosition
    view.edit();
    // Don't move or resize the edit area — keep same dimensions
    (inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement).click();

    // After resetPosition, inner div dimensions should match initial setPosition
    expect(innerDiv.style.width).toBe(initialWidth);
    expect(innerDiv.style.height).toBe(initialHeight);
  });
});

describe('annotateView — tooltip positioning', () => {
  test('tooltip is a child of the view area', () => {
    const { view } = createImageWithNote();

    expect(view.tooltip.parentElement).toBe(view.area);
  });
});

describe('annotateView — editable vs read-only', () => {
  test('editable note area gets editable class when image is also editable', () => {
    const { view } = createImageWithNote({ editable: true });

    expect(view.area.classList.contains('image-annotate-area-editable')).toBe(true);
  });

  test('non-editable note area does not get editable class', () => {
    const { view } = createImageWithNote({ editable: false });

    expect(view.area.classList.contains('image-annotate-area-editable')).toBe(false);
  });

  test('editable flag requires both note.editable and image.editable', () => {
    // Note is editable but image is not
    const note = { top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true };
    const image = createTestImage({ editable: false, notes: [note] });
    const inst = getInstance(image);
    const view = inst.notes[0].view;

    expect(view.editable).toBe(false);
    expect(view.area.classList.contains('image-annotate-area-editable')).toBe(false);
  });
});

describe('annotateView — show and hide', () => {
  test('show() adds hover class for non-editable annotation', () => {
    const { view } = createImageWithNote({ editable: false });

    view.show();

    expect(view.area.classList.contains('image-annotate-area-hover')).toBe(true);
  });

  test('show() adds editable-hover class for editable annotation', () => {
    const { view } = createImageWithNote({ editable: true });

    view.show();

    expect(view.area.classList.contains('image-annotate-area-editable-hover')).toBe(true);
    expect(view.area.classList.contains('image-annotate-area-hover')).toBe(false);
  });

  test('hide() removes both hover classes', () => {
    const { view } = createImageWithNote({ editable: false });

    view.show();
    view.hide();

    expect(view.area.classList.contains('image-annotate-area-hover')).toBe(false);
    expect(view.area.classList.contains('image-annotate-area-editable-hover')).toBe(false);
  });

  test('mouseenter on area shows tooltip', () => {
    const { view } = createImageWithNote();

    view.area.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(view.tooltip.style.display).toBe('block');
  });

  test('mouseleave on area hides tooltip', () => {
    const { view } = createImageWithNote();

    view.area.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    view.area.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

    expect(view.tooltip.style.display).toBe('none');
  });
});

describe('annotateView — destroy', () => {
  test('removes area and note elements from the DOM', () => {
    const { inst, view } = createImageWithNote();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(1);

    view.destroy();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(0);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(0);
  });
});

describe('annotateView — click-to-edit', () => {
  test('click on editable area triggers edit mode', () => {
    const { inst, view } = createImageWithNote({ editable: true });

    view.area.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(inst.mode).toBe('edit');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
  });
});

describe('annotateView — keyboard accessibility', () => {
  test('editable annotation area has tabindex="0" and role="button"', () => {
    const { view } = createImageWithNote({ editable: true });

    expect(view.area.getAttribute('tabindex')).toBe('0');
    expect(view.area.getAttribute('role')).toBe('button');
  });

  test('non-editable annotation area does not have tabindex or role="button"', () => {
    const { view } = createImageWithNote({ editable: false });

    expect(view.area.hasAttribute('tabindex')).toBe(false);
    expect(view.area.getAttribute('role')).not.toBe('button');
  });

  test('Enter key on editable area triggers edit mode', () => {
    const { inst, view } = createImageWithNote({ editable: true });

    view.area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(inst.mode).toBe('edit');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
  });

  test('Space key on editable area triggers edit mode', () => {
    const { inst, view } = createImageWithNote({ editable: true });

    view.area.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(inst.mode).toBe('edit');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
  });

  test('Enter/Space on editable area does nothing if already in edit mode', () => {
    const { inst, view } = createImageWithNote({ editable: true });

    // Enter edit mode first
    view.edit();
    expect(inst.mode).toBe('edit');
    const formCount = inst.canvas.querySelectorAll('.image-annotate-edit-form').length;

    // Pressing Enter should not create another edit form
    view.area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(formCount);
  });
});

describe('annotateView — multiple annotations', () => {
  test('each annotation renders its own area and note', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Alpha', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Beta', id: '2', editable: true },
      { top: 50, left: 50, width: 40, height: 40, text: 'Gamma', id: '3', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(3);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(3);

    // Verify each note text is present
    const noteEls = inst.viewOverlay.querySelectorAll('.image-annotate-note');
    const texts = Array.from(noteEls).map((el) => el.textContent);
    expect(texts).toContain('Alpha');
    expect(texts).toContain('Beta');
    expect(texts).toContain('Gamma');
  });

  test('destroying one annotation does not affect others', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Keep', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Remove', id: '2', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[1].view.destroy();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(1);
    expect(inst.viewOverlay.querySelector('.image-annotate-note').textContent).toBe('Keep');
  });
});
