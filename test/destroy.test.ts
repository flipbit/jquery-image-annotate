import { describe, test, expect } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';

describe('destroy()', () => {
  test('removes canvas from DOM', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    inst.destroy();
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });

  test('restores original image visibility', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(image[0].style.display).toBe('none');
    inst.destroy();
    expect(image[0].style.display).toBe('');
  });

  test('removes "Add Note" button', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(document.querySelector('.image-annotate-add')).not.toBeNull();
    inst.destroy();
    expect(document.querySelector('.image-annotate-add')).toBeNull();
  });

  test('clears annotation views', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'A', id: '1', editable: false },
      { top: 50, left: 50, width: 40, height: 40, text: 'B', id: '2', editable: false },
    ];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.notes.length).toBe(2);
    inst.destroy();
    expect(inst.notes.length).toBe(0);
  });

  test('is idempotent — second call does not throw', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.destroy();
    expect(() => inst.destroy()).not.toThrow();
  });

  test('works when called during active edit', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    // Enter edit mode
    inst.add();
    expect(inst.mode).toBe('edit');
    expect(inst.editOverlay.style.display).toBe('block');

    // Destroy while editing — should not throw
    expect(() => inst.destroy()).not.toThrow();
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });

  test('destroy during active edit properly cleans up the edit session', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    inst.add();
    expect(inst.activeEdit).not.toBeNull();

    inst.destroy();

    // activeEdit nullified proves AnnotateEdit.destroy() ran
    expect(inst.activeEdit).toBeNull();
  });

  test('works on non-editable instance (no button)', () => {
    const image = createTestImage({ editable: false });
    const inst = getInstance(image);

    expect(inst.button).toBeUndefined();
    expect(() => inst.destroy()).not.toThrow();
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });
});

describe('destroy — reinitialize', () => {
  test('can reinitialize plugin on the same image after destroy', () => {
    const image = createTestImage({
      notes: [{ top: 10, left: 20, width: 50, height: 50, text: 'First', id: '1', editable: true }],
    });

    image.annotateImage('destroy');

    // Reinitialize on the same img element
    const notes = [{ top: 30, left: 40, width: 60, height: 60, text: 'Second', id: '2', editable: true }];
    image.annotateImage({ editable: true, notes });
    const inst = getInstance(image);

    expect(document.querySelectorAll('.image-annotate-canvas').length).toBe(1);
    expect(inst.notes.length).toBe(1);
    expect(inst.notes[0].text).toBe('Second');
    expect(document.querySelector('.image-annotate-add')).not.toBeNull();
  });
});

describe('jQuery destroy dispatch', () => {
  test('$(img).annotateImage("destroy") destroys the instance', () => {
    const image = createTestImage();

    expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    image.annotateImage('destroy');
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });

  test('removes jQuery .data() entry', () => {
    const image = createTestImage();

    expect(image.data('annotateImage')).toBeDefined();
    image.annotateImage('destroy');
    expect(image.data('annotateImage')).toBeUndefined();
  });

  test('is safe to call when no instance exists', () => {
    document.body.innerHTML = '';
    const img = $('<img src="test.jpg" />');
    $(document.body).append(img);

    expect(() => img.annotateImage('destroy')).not.toThrow();
  });
});
