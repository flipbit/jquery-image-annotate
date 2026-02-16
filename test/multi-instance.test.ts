import { describe, test, expect } from 'vitest';
import '../src/jquery.annotate.ts';
import { getInstance } from './setup.ts';
import type { AnnotateImageOptions } from '../src/types.ts';

/**
 * Creates two annotated images on the same page for multi-instance tests.
 * Each image gets its own options and notes.
 */
function createTwoImages(opts1: Partial<AnnotateImageOptions> = {}, opts2: Partial<AnnotateImageOptions> = {}) {
  document.body.innerHTML = '';

  const img1 = $('<img id="img-1" width="400" height="300" src="a.jpg" />');
  const img2 = $('<img id="img-2" width="400" height="300" src="b.jpg" />');
  $(document.body).append(img1).append(img2);

  const defaults = { editable: true, notes: [] };
  img1.annotateImage({ ...defaults, ...opts1 });
  img2.annotateImage({ ...defaults, ...opts2 });

  return [img1, img2];
}

describe('multi-instance — canvas isolation', () => {
  test('two images each get their own canvas', () => {
    const [img1, img2] = createTwoImages();
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    expect(inst1.canvas).toBeDefined();
    expect(inst2.canvas).toBeDefined();
    expect(inst1.canvas).not.toBe(inst2.canvas);
  });

  test('each canvas has its own view and edit overlays', () => {
    const [img1, img2] = createTwoImages();
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    expect(inst1.canvas.querySelectorAll('.image-annotate-view').length).toBe(1);
    expect(inst1.canvas.querySelectorAll('.image-annotate-edit').length).toBe(1);
    expect(inst2.canvas.querySelectorAll('.image-annotate-view').length).toBe(1);
    expect(inst2.canvas.querySelectorAll('.image-annotate-edit').length).toBe(1);
  });
});

describe('multi-instance — independent modes', () => {
  test('each image can be in different modes simultaneously', () => {
    const [img1, img2] = createTwoImages();
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    inst1.add();

    expect(inst1.mode).toBe('edit');
    expect(inst2.mode).toBe('view');
  });
});

describe('multi-instance — edit form scoping', () => {
  test('edit form is inside its own canvas, not on body', () => {
    const [img1] = createTwoImages();
    const inst1 = getInstance(img1);

    inst1.add();

    // Form should be inside img1's canvas
    expect(inst1.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
    // Form should NOT be a direct child of body
    expect(document.body.querySelectorAll(':scope > .image-annotate-edit-form').length).toBe(0);
  });

  test('editing one image does not create a form in the other canvas', () => {
    const [img1, img2] = createTwoImages();
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    inst1.add();

    expect(inst1.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
    expect(inst2.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });
});

describe('multi-instance — note isolation', () => {
  test('adding a note to one image does not affect the other', () => {
    const [img1, img2] = createTwoImages();
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    inst1.add();
    inst1.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Note for image 1';
    inst1.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst1.notes.length).toBe(1);
    expect(inst1.notes[0].text).toBe('Note for image 1');
    expect(inst2.notes.length).toBe(0);
  });

  test('both images can have independent annotations loaded', () => {
    const notes1 = [{ top: 10, left: 10, width: 50, height: 50, text: 'Note A', id: '1', editable: true }];
    const notes2 = [
      { top: 20, left: 20, width: 40, height: 40, text: 'Note B', id: '2', editable: true },
      { top: 30, left: 30, width: 60, height: 60, text: 'Note C', id: '3', editable: true },
    ];
    const [img1, img2] = createTwoImages({ notes: notes1 }, { notes: notes2 });
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    expect(inst1.notes.length).toBe(1);
    expect(inst2.notes.length).toBe(2);

    expect(inst1.canvas.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst2.canvas.querySelectorAll('.image-annotate-area').length).toBe(2);
  });
});

describe('multi-instance — destroy isolation', () => {
  test('destroying one instance does not affect the other', () => {
    const notes2 = [{ top: 20, left: 20, width: 40, height: 40, text: 'Survives', id: '1', editable: true }];
    const [img1, img2] = createTwoImages({}, { notes: notes2 });
    const inst1 = getInstance(img1);
    const inst2 = getInstance(img2);

    inst1.destroy();

    expect(inst2.canvas.parentNode).not.toBeNull();
    expect(inst2.notes.length).toBe(1);
    expect(inst2.notes[0].text).toBe('Survives');
    expect(inst2.canvas.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(document.querySelector('.image-annotate-add')).not.toBeNull();
  });
});
