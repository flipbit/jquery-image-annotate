import { describe, test, expect, vi } from 'vitest';
import { annotate, AnnotateImage } from '../src/index.ts';
import { createTestImageVanilla } from './setup.ts';

describe('annotate() factory', () => {
  test('creates an AnnotateImage instance', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    expect(inst).toBeInstanceOf(AnnotateImage);
  });

  test('creates canvas in the DOM', () => {
    const img = createTestImageVanilla();
    annotate(img);

    expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
  });

  test('hides the original image', () => {
    const img = createTestImageVanilla();
    annotate(img);

    expect(img.style.display).toBe('none');
  });

  test('uses defaults when options are partial', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    expect(inst.options.editable).toBe(true);
    expect(inst.options.api).toBeUndefined();
  });

  test('loads static notes', () => {
    const img = createTestImageVanilla();
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'Test', id: '1', editable: false }];
    const inst = annotate(img, { notes });

    expect(inst.notes.length).toBe(1);
    expect(document.querySelector('.image-annotate-area')).not.toBeNull();
  });

  test('notes array contains current annotation data', () => {
    const img = createTestImageVanilla();
    const notes = [
      { top: 10, left: 20, width: 50, height: 60, text: 'First', id: 'a', editable: true },
      { top: 100, left: 200, width: 80, height: 90, text: 'Second', id: 'b', editable: false },
    ];
    const inst = annotate(img, { notes });

    expect(inst.notes).toHaveLength(2);
    expect(inst.notes[0]).toMatchObject({
      top: 10,
      left: 20,
      width: 50,
      height: 60,
      text: 'First',
      id: 'a',
      editable: true,
    });
    expect(inst.notes[1]).toMatchObject({
      top: 100,
      left: 200,
      width: 80,
      height: 90,
      text: 'Second',
      id: 'b',
      editable: false,
    });
  });

  test('instance has expected public methods', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    expect(typeof inst.load).toBe('function');
    expect(typeof inst.clear).toBe('function');
    expect(typeof inst.add).toBe('function');
    expect(typeof inst.destroy).toBe('function');
  });

  test('throws descriptive error when image is not in DOM', () => {
    const img = document.createElement('img');
    img.width = 400;
    img.height = 300;

    expect(() => {
      annotate(img);
    }).toThrow('image-annotate: image must be in the DOM before initialization');
  });

  test('throws when image has zero width', () => {
    const img = document.createElement('img');
    img.width = 0;
    img.height = 300;
    document.body.appendChild(img);

    expect(() => {
      annotate(img);
    }).toThrow('image-annotate: image must have non-zero dimensions (is the image loaded?)');
  });

  test('throws when image has zero height', () => {
    const img = document.createElement('img');
    img.width = 400;
    img.height = 0;
    document.body.appendChild(img);

    expect(() => {
      annotate(img);
    }).toThrow('image-annotate: image must have non-zero dimensions (is the image loaded?)');
  });

  test('destroy() restores the image', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    expect(img.style.display).toBe('none');
    inst.destroy();
    expect(img.style.display).toBe('');
    expect(document.querySelector('.image-annotate-canvas')).toBeNull();
  });

  test('add() returns true when entering edit mode', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    const result = inst.add();

    expect(result).toBe(true);
    expect(inst.mode).toBe('edit');
  });

  test('add() returns false when already in edit mode', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    inst.add();
    const result = inst.add();

    expect(result).toBe(false);
  });
});

describe('annotate() — labels option', () => {
  test('default labels applied via core API', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img);

    expect(inst.options.labels).toBeDefined();
    expect(inst.options.labels!.addNote).toBe('Add Note');
    expect(inst.options.labels!.save).toBe('OK');
  });

  test('custom labels merge correctly via core API', () => {
    const img = createTestImageVanilla();
    const inst = annotate(img, {
      labels: { addNote: 'Notiz hinzufügen', save: 'Speichern' },
    });

    expect(inst.options.labels!.addNote).toBe('Notiz hinzufügen');
    expect(inst.options.labels!.save).toBe('Speichern');
    expect(inst.options.labels!.delete).toBe('Delete');
    expect(inst.options.labels!.cancel).toBe('Cancel');
  });
});

describe('setNotes', () => {
  test('replaces annotations with new data', () => {
    const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
    const img = createTestImageVanilla();
    const instance = annotate(img, { notes });
    expect(instance.canvas.querySelectorAll('.image-annotate-area').length).toBe(1);

    const newNotes = [
      { id: '2', top: 20, left: 20, width: 40, height: 40, text: 'b', editable: true },
      { id: '3', top: 30, left: 30, width: 40, height: 40, text: 'c', editable: false },
    ];
    instance.setNotes(newNotes);
    expect(instance.canvas.querySelectorAll('.image-annotate-area').length).toBe(2);
    expect(instance.notes.length).toBe(2);
  });

  test('does not fire onChange callback', () => {
    const onChange = vi.fn();
    const img = createTestImageVanilla();
    const instance = annotate(img, { onChange });
    onChange.mockClear();

    instance.setNotes([{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'x', editable: true }]);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('cancels active edit before replacing notes', () => {
    const img = createTestImageVanilla();
    const instance = annotate(img);
    instance.add();
    expect(instance.mode).toBe('edit');

    instance.setNotes([]);
    expect(instance.mode).toBe('view');
    expect(instance.activeEdit).toBeNull();
  });

  test('setNotes with empty array clears all views', () => {
    const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
    const img = createTestImageVanilla();
    const instance = annotate(img, { notes });

    instance.setNotes([]);
    expect(instance.canvas.querySelectorAll('.image-annotate-area').length).toBe(0);
    expect(instance.notes.length).toBe(0);
  });
});

describe('setEditable', () => {
  test('setEditable(false) removes Add Note button', () => {
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: true });
    expect(instance.canvas.querySelector('.image-annotate-add')).not.toBeNull();

    instance.setEditable(false);
    expect(instance.canvas.querySelector('.image-annotate-add')).toBeNull();
  });

  test('setEditable(true) creates Add Note button', () => {
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: false });
    expect(instance.canvas.querySelector('.image-annotate-add')).toBeNull();

    instance.setEditable(true);
    expect(instance.canvas.querySelector('.image-annotate-add')).not.toBeNull();
  });

  test('setEditable rebuilds views with updated editability', () => {
    const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: true, notes });
    expect(instance.canvas.querySelector('.image-annotate-area-editable')).not.toBeNull();

    instance.setEditable(false);
    expect(instance.canvas.querySelector('.image-annotate-area-editable')).toBeNull();
    expect(instance.canvas.querySelectorAll('.image-annotate-area').length).toBe(1);
  });

  test('setEditable cancels active edit', () => {
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: true });
    instance.add();
    expect(instance.mode).toBe('edit');

    instance.setEditable(false);
    expect(instance.mode).toBe('view');
    expect(instance.activeEdit).toBeNull();
  });

  test('setEditable(true) when already true is a no-op', () => {
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: true });
    const button = instance.canvas.querySelector('.image-annotate-add');

    instance.setEditable(true);
    expect(instance.canvas.querySelector('.image-annotate-add')).toBe(button);
  });

  test('setEditable does not fire onChange callback', () => {
    const onChange = vi.fn();
    const img = createTestImageVanilla();
    const instance = annotate(img, { editable: true, onChange });
    onChange.mockClear();

    instance.setEditable(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
