import { describe, test, expect, vi } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';

describe('annotateEdit — creating a new annotation', () => {
  test('add() switches mode from view to edit', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.mode).toBe('view');
    inst.add();
    expect(inst.mode).toBe('edit');
  });

  test('add() does nothing if already in edit mode', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');

    // Calling add again should not create another edit form
    const formCountBefore = inst.canvas.querySelectorAll('.image-annotate-edit-form').length;
    inst.add();
    const formCountAfter = inst.canvas.querySelectorAll('.image-annotate-edit-form').length;

    expect(formCountAfter).toBe(formCountBefore);
  });

  test('add() creates an edit form inside the canvas', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form textarea').length).toBe(1);
  });

  test('add() shows edit overlay and adds editing class', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);
  });

  test('new note gets default position values', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const area = inst.canvas.querySelector('.image-annotate-edit-area');
    expect(area.style.height).toBe('30px');
    expect(area.style.width).toBe('30px');
    expect(area.style.left).toBe('30px');
    expect(area.style.top).toBe('30px');
  });

  test('add() creates save and cancel buttons on the form', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form');
    expect(form.querySelectorAll('.image-annotate-edit-ok').length).toBe(1);
    expect(form.querySelectorAll('.image-annotate-edit-close').length).toBe(1);
  });

  test('add() does not create a delete button', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form');
    expect(form.querySelectorAll('.image-annotate-edit-delete').length).toBe(0);
  });
});

describe('annotateEdit — editing an existing annotation', () => {
  test('edit populates textarea with existing note text', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Existing text', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();

    expect(inst.canvas.querySelector('.image-annotate-edit-form textarea').value).toBe('Existing text');
  });

  test('edit positions the area from the existing note', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();

    const area = inst.canvas.querySelector('.image-annotate-edit-area');
    expect(area.style.height).toBe('60px');
    expect(area.style.width).toBe('80px');
    expect(area.style.left).toBe('100px');
    expect(area.style.top).toBe('50px');
  });

  test('edit creates save, delete, and cancel buttons', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();

    const form = inst.canvas.querySelector('.image-annotate-edit-form');
    expect(form.querySelectorAll('.image-annotate-edit-ok').length).toBe(1);
    expect(form.querySelectorAll('.image-annotate-edit-delete').length).toBe(1);
    expect(form.querySelectorAll('.image-annotate-edit-close').length).toBe(1);
  });

  test('edit does nothing if already in edit mode', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    const formCount = inst.canvas.querySelectorAll('.image-annotate-edit-form').length;

    // Try to edit again — should be blocked since mode is 'edit'
    inst.notes[0].view.edit();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(formCount);
  });
});

describe('annotateEdit — button order', () => {
  test('new note buttons appear in order: save, cancel', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form');
    const buttons = form.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].classList.contains('image-annotate-edit-ok')).toBe(true);
    expect(buttons[1].classList.contains('image-annotate-edit-close')).toBe(true);
  });

  test('existing note buttons appear in order: save, delete, cancel', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();

    const form = inst.canvas.querySelector('.image-annotate-edit-form');
    const buttons = form.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].classList.contains('image-annotate-edit-ok')).toBe(true);
    expect(buttons[1].classList.contains('image-annotate-edit-delete')).toBe(true);
    expect(buttons[2].classList.contains('image-annotate-edit-close')).toBe(true);
  });
});

describe('annotateEdit — cancel', () => {
  test('cancel button destroys the edit form and returns to view mode', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);

    inst.canvas.querySelector('.image-annotate-edit-close').click();

    expect(inst.mode).toBe('view');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });

  test('cancel hides the edit overlay', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-close').click();

    expect(inst.editOverlay.style.display).toBe('none');
  });

  test('cancel removes editing class', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-close').click();

    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });
});

describe('annotateEdit — save new annotation', () => {
  test('save creates a new annotation view and adds note to the notes array', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'New annotation';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.notes.length).toBe(1);
    expect(inst.notes[0].text).toBe('New annotation');
    expect(inst.mode).toBe('view');
  });

  test('save removes the edit form', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });

  test('save creates a visible annotation in the view container', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Saved note';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst.viewOverlay.querySelector('.image-annotate-note').textContent).toBe('Saved note');
  });

  test('save with api.save sends JSON to callback', async () => {
    const saveFn = vi.fn(() => Promise.resolve({ annotation_id: 'new-42' }));

    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Existing', id: '1', editable: true }];
    const image = createTestImage({ notes, api: { save: saveFn } });
    const inst = getInstance(image);

    // Enter edit mode on existing note
    inst.notes[0].view!.edit();

    // Change text and save
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Updated';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(saveFn).toHaveBeenCalledOnce();
    });

    // Verify callback received NoteData (no view, no editable)
    const callArg = saveFn.mock.calls[0][0];
    expect(callArg).toHaveProperty('id', '1');
    expect(callArg).toHaveProperty('text', 'Updated');
    expect(callArg).not.toHaveProperty('view');
    expect(callArg).not.toHaveProperty('editable');

    // Verify annotation_id was applied
    expect(inst.notes[0].id).toBe('new-42');
  });

  test('save hides edit overlay and removes editing class', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.editOverlay.style.display).toBe('none');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('save without api.save does not call fetch', () => {
    const image = createTestImage({});
    const inst = getInstance(image);

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Local note';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('annotateEdit — save existing annotation', () => {
  test('save updates the existing annotation text via resetPosition', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Original', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Updated';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.notes[0].text).toBe('Updated');
  });

  test('save existing hides edit overlay and removes editing class', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Original', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Updated';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.editOverlay.style.display).toBe('none');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('save existing does not add a duplicate to the notes array', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Original', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Updated';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.notes.length).toBe(1);
  });
});

describe('annotateEdit — delete', () => {
  test('delete removes the annotation view from the DOM', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'To delete', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(0);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(0);
  });

  test('delete removes the edit form and returns to view mode', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'To delete', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
    expect(inst.mode).toBe('view');
  });

  test('delete hides edit overlay and removes editing class', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'To delete', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    expect(inst.editOverlay.style.display).toBe('none');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('delete with api.delete calls delete callback', async () => {
    const deleteFn = vi.fn(() => Promise.resolve());

    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'To delete', id: '1', editable: true }];
    const image = createTestImage({ notes, api: { delete: deleteFn } });
    const inst = getInstance(image);

    // Enter edit mode on existing note
    inst.notes[0].view!.edit();

    // Click delete
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    await vi.waitFor(() => {
      expect(deleteFn).toHaveBeenCalledOnce();
    });

    // Verify callback received NoteData
    const callArg = deleteFn.mock.calls[0][0];
    expect(callArg).toHaveProperty('id', '1');
    expect(callArg).not.toHaveProperty('view');
    expect(callArg).not.toHaveProperty('editable');

    expect(inst.notes.length).toBe(0);
  });
});

describe('annotateEdit — keyboard accessibility', () => {
  test('textarea receives focus when edit mode opens', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const textarea = inst.canvas.querySelector('.image-annotate-edit-form textarea') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
  });

  test('save button is a semantic <button> element', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const ok = inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement;
    expect(ok.tagName).toBe('BUTTON');
    expect(ok.getAttribute('role')).toBeNull();
    expect(ok.getAttribute('tabindex')).toBeNull();
  });

  test('delete button is a semantic <button> element', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();

    const del = inst.canvas.querySelector('.image-annotate-edit-delete') as HTMLElement;
    expect(del.tagName).toBe('BUTTON');
    expect(del.getAttribute('role')).toBeNull();
    expect(del.getAttribute('tabindex')).toBeNull();
  });

  test('cancel button is a semantic <button> element', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const cancel = inst.canvas.querySelector('.image-annotate-edit-close') as HTMLElement;
    expect(cancel.tagName).toBe('BUTTON');
    expect(cancel.getAttribute('role')).toBeNull();
    expect(cancel.getAttribute('tabindex')).toBeNull();
  });

  test('Escape key triggers cancel', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');

    inst.canvas
      .querySelector('.image-annotate-edit-form')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(inst.mode).toBe('view');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });

  test('save button click triggers save', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea')!.value = 'Keyboard save';

    const ok = inst.canvas.querySelector('.image-annotate-edit-ok') as HTMLElement;
    ok.click();

    expect(inst.mode).toBe('view');
    expect(inst.notes.length).toBe(1);
    expect(inst.notes[0].text).toBe('Keyboard save');
  });

  test('cancel button click triggers cancel', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');

    const cancel = inst.canvas.querySelector('.image-annotate-edit-close') as HTMLElement;
    cancel.click();

    expect(inst.mode).toBe('view');
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });
});

describe('annotateEdit — form positioning', () => {
  test('form is a child of the edit area', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form') as HTMLElement;
    const area = inst.canvas.querySelector('.image-annotate-edit-area') as HTMLElement;
    expect(form.parentElement).toBe(area);
  });

  test('form has no inline top/left positioning', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form') as HTMLElement;
    expect(form.style.top).toBe('');
    expect(form.style.left).toBe('');
  });

  test('form position is consistent after a zero-distance drag', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();

    const form = inst.canvas.querySelector('.image-annotate-edit-form') as HTMLElement;
    const area = inst.canvas.querySelector('.image-annotate-edit-area') as HTMLElement;
    const formTopBefore = form.style.top;

    // Simulate zero-distance drag
    area.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, clientY: 50, button: 0, bubbles: true }));
    area.dispatchEvent(new PointerEvent('pointerup', { clientX: 50, clientY: 50, bubbles: true }));

    expect(form.style.top).toBe(formTopBefore);
  });
});

describe('annotateEdit — position serialization', () => {
  test('save callback receives position, size, id, and text', async () => {
    const saveFn = vi.fn(() => Promise.resolve({ annotation_id: '42' }));

    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { save: saveFn },
    });

    const inst = getInstance(img);
    inst.add();

    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test text';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(saveFn).toHaveBeenCalledOnce();
    });

    const noteData = saveFn.mock.calls[0][0];
    expect(noteData).toHaveProperty('top');
    expect(noteData).toHaveProperty('left');
    expect(noteData).toHaveProperty('width');
    expect(noteData).toHaveProperty('height');
    expect(noteData).toHaveProperty('id');
    expect(noteData).toHaveProperty('text', 'Test text');
    expect(typeof noteData.top).toBe('number');
    expect(typeof noteData.left).toBe('number');
  });
});

describe('activeEdit tracking', () => {
  test('activeEdit is set when add() enters edit mode', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.activeEdit).toBeNull();
    inst.add();
    expect(inst.activeEdit).not.toBeNull();
  });

  test('activeEdit is cleared after cancel', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    expect(inst.activeEdit).not.toBeNull();

    inst.canvas.querySelector('.image-annotate-edit-close').click();
    expect(inst.activeEdit).toBeNull();
  });

  test('activeEdit is set when view.edit() enters edit mode', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.activeEdit).toBeNull();
    inst.notes[0].view.edit();
    expect(inst.activeEdit).not.toBeNull();
  });

  test('activeEdit is cleared after save', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    expect(inst.activeEdit).toBeNull();
  });

  test('activeEdit is cleared after delete', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    inst.notes[0].view.edit();
    expect(inst.activeEdit).not.toBeNull();

    inst.canvas.querySelector('.image-annotate-edit-delete').click();
    expect(inst.activeEdit).toBeNull();
  });
});
