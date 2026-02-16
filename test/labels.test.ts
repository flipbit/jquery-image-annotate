import { describe, test, expect } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';

describe('labels — defaults', () => {
  test('default labels are applied when no labels option provided', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.options.labels).toBeDefined();
    expect(inst.options.labels!.addNote).toBe('Add Note');
    expect(inst.options.labels!.save).toBe('OK');
    expect(inst.options.labels!.delete).toBe('Delete');
    expect(inst.options.labels!.cancel).toBe('Cancel');
    expect(inst.options.labels!.placeholder).toBe('');
  });
});

describe('labels — partial overrides', () => {
  test('partial override merges with defaults', () => {
    const image = createTestImage({ labels: { save: 'Speichern' } });
    const inst = getInstance(image);

    expect(inst.options.labels!.save).toBe('Speichern');
    expect(inst.options.labels!.addNote).toBe('Add Note');
    expect(inst.options.labels!.delete).toBe('Delete');
    expect(inst.options.labels!.cancel).toBe('Cancel');
    expect(inst.options.labels!.placeholder).toBe('');
  });

  test('full override replaces all labels', () => {
    const image = createTestImage({
      labels: {
        addNote: 'Notiz hinzufügen',
        save: 'Speichern',
        delete: 'Löschen',
        cancel: 'Abbrechen',
        placeholder: 'Notiz eingeben...',
      },
    });
    const inst = getInstance(image);

    expect(inst.options.labels!.addNote).toBe('Notiz hinzufügen');
    expect(inst.options.labels!.save).toBe('Speichern');
    expect(inst.options.labels!.delete).toBe('Löschen');
    expect(inst.options.labels!.cancel).toBe('Abbrechen');
    expect(inst.options.labels!.placeholder).toBe('Notiz eingeben...');
  });

  test('empty string labels are preserved (not replaced by defaults)', () => {
    const image = createTestImage({
      labels: { addNote: '', save: '', delete: '', cancel: '' },
    });
    const inst = getInstance(image);

    expect(inst.options.labels!.addNote).toBe('');
    expect(inst.options.labels!.save).toBe('');
    expect(inst.options.labels!.delete).toBe('');
    expect(inst.options.labels!.cancel).toBe('');
  });
});

describe('labels — edit form buttons', () => {
  test('save button uses labels.save text', () => {
    const image = createTestImage({ labels: { save: 'Speichern' } });
    const inst = getInstance(image);

    inst.add();
    const ok = inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement;
    expect(ok.textContent).toBe('Speichern');
  });

  test('cancel button uses labels.cancel text', () => {
    const image = createTestImage({ labels: { cancel: 'Abbrechen' } });
    const inst = getInstance(image);

    inst.add();
    const cancel = inst.canvas.querySelector('.image-annotate-edit-close') as HTMLElement;
    expect(cancel.textContent).toBe('Abbrechen');
  });

  test('delete button uses labels.delete text', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes, labels: { delete: 'Löschen' } });
    const inst = getInstance(image);

    inst.notes[0].view!.edit();
    const del = inst.canvas.querySelector('.image-annotate-edit-delete') as HTMLElement;
    expect(del.textContent).toBe('Löschen');
  });

  test('empty string labels produce buttons with no text', () => {
    const image = createTestImage({ labels: { save: '', cancel: '' } });
    const inst = getInstance(image);

    inst.add();
    const ok = inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement;
    const cancel = inst.canvas.querySelector('.image-annotate-edit-close') as HTMLElement;
    expect(ok.textContent).toBe('');
    expect(cancel.textContent).toBe('');
  });
});

describe('labels — textarea placeholder', () => {
  test('textarea has no placeholder by default', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    const textarea = inst.canvas.querySelector('.image-annotate-edit-form textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('');
  });

  test('textarea uses labels.placeholder when configured', () => {
    const image = createTestImage({ labels: { placeholder: 'Notiz eingeben...' } });
    const inst = getInstance(image);

    inst.add();
    const textarea = inst.canvas.querySelector('.image-annotate-edit-form textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('Notiz eingeben...');
  });
});
