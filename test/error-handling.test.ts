import { describe, test, expect, vi } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';
import type { AnnotateImageOptions } from '../src/types.ts';

function createAjaxImage(options: Partial<AnnotateImageOptions> = {}) {
  document.body.innerHTML = '';
  const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
  $(document.body).append(img);

  img.annotateImage({
    editable: true,
    api: {
      save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    ...options,
  });

  const inst = getInstance(img);
  return inst;
}

describe('reportError', () => {
  test('calls onError callback when provided', () => {
    const onError = vi.fn();
    const image = createTestImage({ onError });
    const inst = getInstance(image);

    const error = new Error('test');
    inst.reportError({ type: 'save', error, note: inst.notes[0] });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith({ type: 'save', error, note: inst.notes[0] });
  });

  test('logs to console.error when no onError provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const image = createTestImage();
    const inst = getInstance(image);

    const error = new Error('test');
    inst.reportError({ type: 'load', error });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith('image-annotate: load failed', error);
  });
});

describe('API load error handling', () => {
  test('calls onError when load URL returns non-ok response', async () => {
    const onError = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );

    document.body.innerHTML = '';
    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: '/api/get' },
      onError,
    });

    // Wait for the fetch promise chain to resolve
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    expect(onError.mock.calls[0][0].type).toBe('load');
    expect(onError.mock.calls[0][0].error).toBeInstanceOf(Error);
  });

  test('calls onError when load function rejects (network error)', async () => {
    const onError = vi.fn();

    document.body.innerHTML = '';
    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: () => Promise.reject(new Error('Network failure')) },
      onError,
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    expect(onError.mock.calls[0][0].type).toBe('load');
    expect(onError.mock.calls[0][0].error.message).toBe('Network failure');
  });

  test('logs to console.error when no onError and load fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    document.body.innerHTML = '';
    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: () => Promise.reject(new Error('Load failed')) },
    });

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith('image-annotate: load failed', expect.any(Error));
  });
});

describe('save error handling', () => {
  test('save failure keeps edit form open and stays in edit mode', async () => {
    const onError = vi.fn();
    const saveFn = vi.fn(() => Promise.reject(new Error('Save failed (HTTP 500)')));
    const inst = createAjaxImage({
      onError,
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    // Edit form should still be present
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
    expect(inst.mode).toBe('edit');
    // Note should NOT have been added
    expect(inst.notes.length).toBe(0);
  });

  test('save failure calls onError with correct context', async () => {
    const onError = vi.fn();
    const saveFn = vi.fn(() => Promise.reject(new Error('Save failed (HTTP 500)')));
    const inst = createAjaxImage({
      onError,
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    const ctx = onError.mock.calls[0][0];
    expect(ctx.type).toBe('save');
    expect(ctx.error).toBeInstanceOf(Error);
    expect(ctx.note).toBeDefined();
    expect(ctx.note.id).toBe('new');
  });

  test('save network failure calls onError', async () => {
    const onError = vi.fn();
    const saveFn = vi.fn(() => Promise.reject(new Error('Network error')));
    const inst = createAjaxImage({
      onError,
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    expect(onError.mock.calls[0][0].type).toBe('save');
    expect(onError.mock.calls[0][0].error.message).toBe('Network error');
  });

  test('save success destroys edit form and creates view', async () => {
    const saveFn = vi.fn(() => Promise.resolve({ annotation_id: '42' }));
    const inst = createAjaxImage({
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Saved';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(inst.mode).toBe('view');
    });

    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
    expect(inst.notes.length).toBe(1);
    expect(inst.notes[0].text).toBe('Saved');
    expect(inst.notes[0].id).toBe('42');
  });

  test('save success hides edit overlay and removes editing class', async () => {
    const saveFn = vi.fn(() => Promise.resolve({ annotation_id: '42' }));
    const inst = createAjaxImage({
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    inst.canvas.querySelector('.image-annotate-edit-ok').click();

    await vi.waitFor(() => {
      expect(inst.mode).toBe('view');
    });

    expect(inst.editOverlay.style.display).toBe('none');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('save double-click is prevented', async () => {
    let resolveFirst: (value: { annotation_id?: string }) => void;
    const saveFn = vi.fn(
      () =>
        new Promise<{ annotation_id?: string }>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const inst = createAjaxImage({
      api: { save: saveFn, delete: vi.fn(() => Promise.resolve()) },
    });

    inst.add();
    inst.canvas.querySelector('.image-annotate-edit-form textarea').value = 'Test';
    const okBtn = inst.canvas.querySelector('.image-annotate-edit-ok');

    okBtn.click();
    okBtn.click(); // second click should be ignored

    expect(saveFn.mock.calls.length).toBe(1);

    // Resolve so the test can clean up
    resolveFirst!({ annotation_id: 'done' });
  });
});

describe('delete error handling', () => {
  test('delete failure keeps edit form open and view intact', async () => {
    const onError = vi.fn();
    const deleteFn = vi.fn(() => Promise.reject(new Error('Delete failed (HTTP 500)')));
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Keep me', id: '1', editable: true }];
    const inst = createAjaxImage({
      onError,
      api: { save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })), delete: deleteFn },
    });

    inst.notes = notes.map((n) => ({ ...n }));
    inst.load();

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    // Edit form should still be present
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);
    expect(inst.mode).toBe('edit');
    // View elements should still exist
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
    // Note should still be in array
    expect(inst.notes.length).toBe(1);
  });

  test('delete failure calls onError with correct context', async () => {
    const onError = vi.fn();
    const deleteFn = vi.fn(() => Promise.reject(new Error('Delete failed (HTTP 500)')));
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const inst = createAjaxImage({
      onError,
      api: { save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })), delete: deleteFn },
    });

    inst.notes = notes.map((n) => ({ ...n }));
    inst.load();

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    const ctx = onError.mock.calls[0][0];
    expect(ctx.type).toBe('delete');
    expect(ctx.error).toBeInstanceOf(Error);
    expect(ctx.note).toBeDefined();
    expect(ctx.note.id).toBe('1');
  });

  test('delete success removes note from image.notes', async () => {
    const deleteFn = vi.fn(() => Promise.resolve());
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Delete me', id: '1', editable: true }];
    const inst = createAjaxImage({
      api: { save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })), delete: deleteFn },
    });
    inst.notes = notes.map((n) => ({ ...n }));
    inst.load();

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    await vi.waitFor(() => {
      expect(inst.mode).toBe('view');
    });

    expect(inst.notes.length).toBe(0);
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(0);
  });

  test('delete success hides edit overlay and removes editing class', async () => {
    const deleteFn = vi.fn(() => Promise.resolve());
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Delete me', id: '1', editable: true }];
    const inst = createAjaxImage({
      api: { save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })), delete: deleteFn },
    });
    inst.notes = notes.map((n) => ({ ...n }));
    inst.load();

    inst.notes[0].view.edit();
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);

    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    await vi.waitFor(() => {
      expect(inst.mode).toBe('view');
    });

    expect(inst.editOverlay.style.display).toBe('none');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('delete double-click is prevented', async () => {
    let resolveFirst: () => void;
    const deleteFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Test', id: '1', editable: true }];
    const inst = createAjaxImage({
      api: { save: vi.fn(() => Promise.resolve({ annotation_id: 'saved-1' })), delete: deleteFn },
    });
    inst.notes = notes.map((n) => ({ ...n }));
    inst.load();

    inst.notes[0].view.edit();
    const delBtn = inst.canvas.querySelector('.image-annotate-edit-delete');

    delBtn.click();
    delBtn.click(); // second click should be ignored

    expect(deleteFn.mock.calls.length).toBe(1);

    // Resolve so the test can clean up
    resolveFirst!();
  });

  test('delete without api.delete removes note from array (static mode)', () => {
    const notes = [{ top: 50, left: 100, width: 80, height: 60, text: 'Delete me', id: '1', editable: true }];
    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.notes.length).toBe(1);

    inst.notes[0].view.edit();
    inst.canvas.querySelector('.image-annotate-edit-delete').click();

    expect(inst.notes.length).toBe(0);
    expect(inst.mode).toBe('view');
  });
});
