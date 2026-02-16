import { describe, it, expect, vi } from 'vitest';
import { annotate } from '../src/index';
import { createTestImageVanilla } from './setup';

const sampleNotes = () => [
  { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'note one', editable: true },
  { id: '2', top: 20, left: 20, width: 60, height: 60, text: 'note two', editable: true },
];

const strippedNote = (n: { id: string; top: number; left: number; width: number; height: number; text: string }) => ({
  id: n.id,
  top: n.top,
  left: n.left,
  width: n.width,
  height: n.height,
  text: n.text,
});

describe('lifecycle callbacks', () => {
  describe('onChange', () => {
    it('fires after initial load with stripped notes', () => {
      const onChange = vi.fn();
      const img = createTestImageVanilla();
      const notes = sampleNotes();
      annotate(img, { notes, onChange });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(notes.map(strippedNote));
    });

    it('does not throw when onChange is omitted', () => {
      const img = createTestImageVanilla();
      expect(() => annotate(img, { notes: sampleNotes() })).not.toThrow();
    });

    it('fires after clear() with empty array', () => {
      const onChange = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { notes: sampleNotes(), onChange });
      onChange.mockClear();

      instance.clear();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('strips view and editable from notes', () => {
      const onChange = vi.fn();
      const img = createTestImageVanilla();
      annotate(img, { notes: sampleNotes(), onChange });

      const received = onChange.mock.calls[0][0][0];
      expect(received).not.toHaveProperty('view');
      expect(received).not.toHaveProperty('editable');
    });

    it('fires after save with updated notes array', () => {
      const onChange = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { onChange });
      onChange.mockClear();

      instance.add();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'new annotation';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toHaveLength(1);
      expect(onChange.mock.calls[0][0][0].text).toBe('new annotation');
    });

    it('fires after delete with reduced notes array', () => {
      const onChange = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { notes: sampleNotes(), onChange });
      onChange.mockClear();

      // Click annotation to edit
      const area = instance.viewOverlay.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      // Click delete
      const del = instance.editOverlay.querySelector('.image-annotate-edit-delete') as HTMLElement;
      del.click();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('onSave', () => {
    it('fires when a new annotation is saved', () => {
      const onSave = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { onSave });

      instance.add();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'saved note';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(onSave).toHaveBeenCalledTimes(1);
      const note = onSave.mock.calls[0][0];
      expect(note.text).toBe('saved note');
      expect(note).not.toHaveProperty('view');
      expect(note).not.toHaveProperty('editable');
    });

    it('fires when an existing annotation is edited', () => {
      const onSave = vi.fn();
      const img = createTestImageVanilla();
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'original', editable: true }];
      const instance = annotate(img, { notes, onSave });

      const area = instance.viewOverlay.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'edited';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].text).toBe('edited');
    });

    it('does not fire on cancel', () => {
      const onSave = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { onSave });

      instance.add();
      const cancel = instance.editOverlay.querySelector('.image-annotate-edit-close') as HTMLElement;
      cancel.click();

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('onDelete', () => {
    it('fires when an annotation is deleted', () => {
      const onDelete = vi.fn();
      const img = createTestImageVanilla();
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'doomed', editable: true }];
      const instance = annotate(img, { notes, onDelete });

      const area = instance.viewOverlay.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      const del = instance.editOverlay.querySelector('.image-annotate-edit-delete') as HTMLElement;
      del.click();

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete.mock.calls[0][0].id).toBe('1');
      expect(onDelete.mock.calls[0][0]).not.toHaveProperty('view');
      expect(onDelete.mock.calls[0][0]).not.toHaveProperty('editable');
    });

    it('does not fire on save', () => {
      const onDelete = vi.fn();
      const img = createTestImageVanilla();
      const instance = annotate(img, { onDelete });

      instance.add();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'test';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('onLoad', () => {
    it('fires after initial load with stripped notes', () => {
      const onLoad = vi.fn();
      const img = createTestImageVanilla();
      const notes = sampleNotes();
      annotate(img, { notes, onLoad });

      expect(onLoad).toHaveBeenCalledTimes(1);
      expect(onLoad).toHaveBeenCalledWith(notes.map(strippedNote));
    });

    it('fires with empty array when no notes', () => {
      const onLoad = vi.fn();
      const img = createTestImageVanilla();
      annotate(img, { onLoad });

      expect(onLoad).toHaveBeenCalledTimes(1);
      expect(onLoad).toHaveBeenCalledWith([]);
    });
  });

  describe('getNotes', () => {
    it('returns stripped notes array', () => {
      const img = createTestImageVanilla();
      const notes = sampleNotes();
      const instance = annotate(img, { notes });

      const result = instance.getNotes();
      expect(result).toEqual(notes.map(strippedNote));
    });

    it('returns empty array when no notes', () => {
      const img = createTestImageVanilla();
      const instance = annotate(img);

      expect(instance.getNotes()).toEqual([]);
    });

    it('reflects changes after save', () => {
      const img = createTestImageVanilla();
      const instance = annotate(img);

      instance.add();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'new';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      const result = instance.getNotes();
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('new');
      expect(result[0]).not.toHaveProperty('view');
    });
  });

  describe('callback ordering', () => {
    it('fires onSave before onChange', () => {
      const order: string[] = [];
      const img = createTestImageVanilla();
      const instance = annotate(img, {
        onSave: () => order.push('save'),
        onChange: () => order.push('change'),
      });
      // Clear the initial onChange from load
      order.length = 0;

      instance.add();
      const textarea = instance.editOverlay.querySelector('textarea')!;
      textarea.value = 'test';
      const ok = instance.editOverlay.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(order).toEqual(['save', 'change']);
    });

    it('fires onDelete before onChange', () => {
      const order: string[] = [];
      const img = createTestImageVanilla();
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'x', editable: true }];
      const instance = annotate(img, {
        notes,
        onDelete: () => order.push('delete'),
        onChange: () => order.push('change'),
      });
      order.length = 0;

      const area = instance.viewOverlay.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      const del = instance.editOverlay.querySelector('.image-annotate-edit-delete') as HTMLElement;
      del.click();

      expect(order).toEqual(['delete', 'change']);
    });

    it('fires onLoad before onChange', () => {
      const order: string[] = [];
      const img = createTestImageVanilla();
      annotate(img, {
        notes: sampleNotes(),
        onLoad: () => order.push('load'),
        onChange: () => order.push('change'),
      });

      expect(order).toEqual(['load', 'change']);
    });
  });
});
