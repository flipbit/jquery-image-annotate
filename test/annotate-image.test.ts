import { describe, test, expect, vi } from 'vitest';
import '../src/jquery.annotate.ts';
import { createTestImage, getInstance } from './setup.ts';
import type { AnnotateView } from '../src/annotate-view';

describe('annotateImage — initialization', () => {
  test('creates canvas with view and edit overlays', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.canvas).toBeDefined();
    expect(inst.canvas.classList.contains('image-annotate-canvas')).toBe(true);
    expect(inst.canvas.querySelectorAll('.image-annotate-view').length).toBe(1);
    expect(inst.canvas.querySelectorAll('.image-annotate-edit').length).toBe(1);
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-area').length).toBe(1);
  });

  test('canvas is inserted after the original image', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    const next = image[0].nextElementSibling;
    expect(next).toBe(inst.canvas);
    expect(next.classList.contains('image-annotate-canvas')).toBe(true);
  });

  test('sets canvas background-image from the img src', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.canvas.style.backgroundImage).toContain('test.jpg');
  });

  test('hides the original image', () => {
    const image = createTestImage();

    expect(image[0].style.display).toBe('none');
  });

  test('view overlay has no inline display style (CSS controls visibility)', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.viewOverlay.style.display).toBe('');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
  });

  test('edit overlay is initially hidden', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.editOverlay.style.display).toBe('none');
  });

  test('starts in view mode', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    expect(inst.mode).toBe('view');
  });

  test('stores plugin options on the instance', () => {
    const image = createTestImage({
      editable: true,
      notes: [],
    });
    const inst = getInstance(image);

    expect(inst.options.editable).toBe(true);
    expect(inst.options.api).toBeUndefined();
    expect(inst.notes).toEqual([]);
  });

  test('Add Note is a <button> element', () => {
    const image = createTestImage();
    const inst = getInstance(image);
    expect(inst.button).toBeDefined();
    expect(inst.button!.tagName).toBe('BUTTON');
  });

  test('returns the jQuery image object for chaining', () => {
    document.body.innerHTML = '';
    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    const result = img.annotateImage({ editable: false, notes: [] });

    expect(result).toBe(img);
  });
});

describe('setMode — centralized mode transitions', () => {
  test('setMode("edit") sets mode to edit, shows editOverlay, adds editing class', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.setMode('edit');

    expect(inst.mode).toBe('edit');
    expect(inst.editOverlay.style.display).toBe('block');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);
  });

  test('setMode("view") sets mode to view, removes editing class, hides editOverlay', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.setMode('edit');
    inst.setMode('view');

    expect(inst.mode).toBe('view');
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(false);
    expect(inst.editOverlay.style.display).toBe('none');
  });
});

describe('hover visibility — CSS-controlled', () => {
  test('mouseenter on canvas does not set inline display on viewOverlay', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.canvas.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(inst.viewOverlay.style.display).toBe('');
  });

  test('mouseleave on canvas does not set inline display on viewOverlay', () => {
    const image = createTestImage();
    const inst = getInstance(image);

    inst.canvas.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    inst.canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

    expect(inst.viewOverlay.style.display).toBe('');
  });
});

describe('annotateImage — "Add Note" button', () => {
  test('creates "Add Note" button inside the canvas when editable', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(inst.button).toBeDefined();
    expect(inst.button!.classList.contains('image-annotate-add')).toBe(true);
    expect(inst.button!.parentElement).toBe(inst.canvas);
  });

  test('Add Note button has no text content (icon-only)', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(inst.button!.textContent).toBe('');
  });

  test('Add Note button has title attribute matching labels.addNote', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(inst.button!.getAttribute('title')).toBe('Add Note');
  });

  test('Add Note button title reflects custom label', () => {
    const image = createTestImage({ editable: true, labels: { addNote: 'Notiz hinzufügen' } });
    const inst = getInstance(image);

    expect(inst.button!.getAttribute('title')).toBe('Notiz hinzufügen');
  });

  test('does not create "Add Note" button when not editable', () => {
    const image = createTestImage({ editable: false });
    const inst = getInstance(image);

    expect(inst.button).toBeUndefined();
    expect(document.body.querySelectorAll('.image-annotate-add').length).toBe(0);
  });

  test('Add Note button remains in canvas during edit mode (CSS controls visibility)', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    inst.add();
    expect(inst.canvas.classList.contains('image-annotate-editing')).toBe(true);
    expect(inst.button!.parentElement).toBe(inst.canvas);
  });
});

describe('annotateImage — static note loading', () => {
  test('loads notes passed in options', () => {
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'Test', id: '1', editable: false }];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.notes.length).toBe(1);
    expect(inst.canvas.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst.canvas.querySelectorAll('.image-annotate-note').length).toBe(1);
  });

  test('handles empty notes array', () => {
    const image = createTestImage({ notes: [] });
    const inst = getInstance(image);

    expect(inst.notes.length).toBe(0);
    expect(inst.canvas.querySelectorAll('.image-annotate-area').length).toBe(0);
  });

  test('loads multiple notes with distinct DOM elements', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'First', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Second', id: '2', editable: false },
      { top: 50, left: 50, width: 40, height: 40, text: 'Third', id: '3', editable: true },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.canvas.querySelectorAll('.image-annotate-area').length).toBe(3);
    expect(inst.canvas.querySelectorAll('.image-annotate-note').length).toBe(3);
  });
});

describe('annotateImage — API loading', () => {
  test('calls fetch with exact URL when api.load is a string', async () => {
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'A', id: '1', editable: true }];
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(notes) }));
    vi.stubGlobal('fetch', fetchSpy);

    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: '/api/annotations' },
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/annotations');

    await vi.waitFor(() => {
      const inst = getInstance(img);
      expect(inst.notes.length).toBe(1);
    });
  });

  test('calls function callback when api.load is a function', async () => {
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'A', id: '1', editable: true }];
    const loadFn = vi.fn(() => Promise.resolve(notes));

    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: loadFn },
    });

    expect(loadFn).toHaveBeenCalledOnce();

    await vi.waitFor(() => {
      const inst = getInstance(img);
      expect(inst.notes.length).toBe(1);
    });
  });

  test('clears existing views before loading API response', async () => {
    const staticNotes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Static 1', id: '1', editable: true },
      { top: 100, left: 200, width: 80, height: 60, text: 'Static 2', id: '2', editable: false },
    ];

    const image = createTestImage({ notes: staticNotes });
    const inst = getInstance(image);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(2);

    // Now load from API with different data
    const apiNotes = [{ top: 50, left: 60, width: 70, height: 80, text: 'API', id: '3', editable: true }];
    inst.api.load = () => Promise.resolve(apiNotes);
    // Access private method for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (inst as any).loadFromApi();

    await vi.waitFor(() => {
      expect(inst.notes.length).toBe(1);
    });

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(1);
    expect(inst.notes[0].text).toBe('API');
  });

  test('loads annotations and renders views from API', async () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Note A', id: '1', editable: true },
      { top: 100, left: 200, width: 80, height: 60, text: 'Note B', id: '2', editable: false },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(notes) })),
    );

    const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
    $(document.body).append(img);

    img.annotateImage({
      editable: true,
      api: { load: '/api/annotations' },
    });

    await vi.waitFor(() => {
      const inst = getInstance(img);
      expect(inst.notes.length).toBe(2);
    });

    const inst = getInstance(img);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(2);
  });

  test('no api.load means static mode — no fetch called', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'Static', id: '1', editable: true }];
    const image = createTestImage({ notes });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getInstance(image).notes.length).toBe(1);
  });
});

describe('load() — note array integrity', () => {
  test('notes array contains only note data objects at integer indices after load', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Note A', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Note B', id: '2', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    // notes array should still have exactly 2 entries at indices 0 and 1
    expect(inst.notes.length).toBe(2);
    expect(inst.notes[0].text).toBe('Note A');
    expect(inst.notes[1].text).toBe('Note B');
  });

  test('each note has a .view property referencing its annotateView instance after load', () => {
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'Note A', id: '1', editable: false }];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.notes[0].view).toBeDefined();
    expect(typeof inst.notes[0].view.destroy).toBe('function');
  });

  test('view instances are distinct when multiple notes are loaded', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'First', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Second', id: '2', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.notes[0].view).toBeDefined();
    expect(inst.notes[1].view).toBeDefined();
    expect(inst.notes[0].view).not.toBe(inst.notes[1].view);
  });
});

describe('load() — prevents duplicate views', () => {
  test('calling load() twice does not duplicate DOM elements', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Note A', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Note B', id: '2', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(2);

    inst.load();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(2);
  });

  test('load() during edit mode cancels the edit', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');
    expect(inst.activeEdit).not.toBeNull();

    inst.load();

    expect(inst.mode).toBe('view');
    expect(inst.activeEdit).toBeNull();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });
});

describe('clear() — destroys all annotation views', () => {
  test('all annotation view DOM elements are removed from the canvas', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'Note A', id: '1', editable: false },
      { top: 100, left: 200, width: 60, height: 60, text: 'Note B', id: '2', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(2);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(2);

    inst.clear();

    expect(inst.viewOverlay.querySelectorAll('.image-annotate-area').length).toBe(0);
    expect(inst.viewOverlay.querySelectorAll('.image-annotate-note').length).toBe(0);
    expect(inst.notes.length).toBe(0);
  });

  test('clear() cancels active edit and returns to view mode', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');
    expect(inst.activeEdit).not.toBeNull();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);

    inst.clear();

    expect(inst.mode).toBe('view');
    expect(inst.activeEdit).toBeNull();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
    expect(inst.notes.length).toBe(0);
  });
});

describe('XSS — annotation text is escaped', () => {
  test('script tags in note text are rendered as visible text, not executed', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: '<script>alert("xss")</script>', id: '1', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    const noteEl = inst.canvas.querySelector('.image-annotate-note')!;
    expect(noteEl.textContent).toBe('<script>alert("xss")</script>');
    expect(noteEl.querySelector('script')).toBeNull();
  });

  test('HTML injection in note text does not create DOM elements', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: '<img src=x onerror=alert(1)>', id: '1', editable: false },
    ];

    const image = createTestImage({ notes });
    const inst = getInstance(image);

    const noteEl = inst.canvas.querySelector('.image-annotate-note')!;
    expect(noteEl.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(noteEl.querySelector('img')).toBeNull();
  });
});

describe('annotateImage — keyboard accessibility', () => {
  test('Add Note button is a semantic <button> (no role needed)', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(inst.button!.tagName).toBe('BUTTON');
    expect(inst.button!.getAttribute('role')).toBeNull();
  });
});

describe('normalizeApi', () => {
  test('converts string load to function that calls fetch with exact URL', async () => {
    const notes = [{ id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test', editable: true }];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(notes) })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ load: '/api/annotations' });

    const result = await api.load!();
    expect(fetch).toHaveBeenCalledWith('/api/annotations');
    expect(result).toEqual(notes);
  });

  test('converts string save to function that POSTs JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ annotation_id: '42' }) })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ save: '/api/save' });
    const note = { id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test' };

    const result = await api.save!(note);
    expect(fetch).toHaveBeenCalledWith('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    expect(result).toEqual({ annotation_id: '42' });
  });

  test('converts string delete to function that POSTs JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ delete: '/api/delete' });
    const note = { id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test' };

    await api.delete!(note);
    expect(fetch).toHaveBeenCalledWith('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
  });

  test('passes function callbacks through unchanged', async () => {
    const loadFn = vi.fn(() => Promise.resolve([]));
    const saveFn = vi.fn(() => Promise.resolve({}));
    const deleteFn = vi.fn(() => Promise.resolve());

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ load: loadFn, save: saveFn, delete: deleteFn });

    expect(api.load).toBe(loadFn);
    expect(api.save).toBe(saveFn);
    expect(api.delete).toBe(deleteFn);
  });

  test('load throws on non-ok HTTP response with status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ load: '/api/annotations' });

    await expect(api.load!()).rejects.toThrow('Load failed (HTTP 404)');
  });

  test('save throws on non-ok HTTP response with status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 422 })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ save: '/api/save' });

    const note = { id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test' };
    await expect(api.save!(note)).rejects.toThrow('Save failed (HTTP 422)');
  });

  test('delete throws on non-ok HTTP response with status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );

    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({ delete: '/api/delete' });

    const note = { id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test' };
    await expect(api.delete!(note)).rejects.toThrow('Delete failed (HTTP 500)');
  });

  test('undefined fields stay undefined', async () => {
    const { normalizeApi } = await import('../src/annotate-image');
    const api = normalizeApi({});

    expect(api.load).toBeUndefined();
    expect(api.save).toBeUndefined();
    expect(api.delete).toBeUndefined();
  });
});

describe('cancelEdit', () => {
  test('destroys edit form and returns to view mode', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    inst.add();
    expect(inst.mode).toBe('edit');
    expect(inst.activeEdit).not.toBeNull();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(1);

    inst.cancelEdit();

    expect(inst.mode).toBe('view');
    expect(inst.activeEdit).toBeNull();
    expect(inst.canvas.querySelectorAll('.image-annotate-edit-form').length).toBe(0);
  });

  test('is a no-op when not editing', () => {
    const image = createTestImage({ editable: true });
    const inst = getInstance(image);

    expect(inst.mode).toBe('view');

    inst.cancelEdit();

    expect(inst.mode).toBe('view');
  });

  test('on existing note edit does not delete the note', () => {
    const notes = [{ top: 10, left: 20, width: 50, height: 50, text: 'Keep me', id: '1', editable: true }];
    const image = createTestImage({ editable: true, notes });
    const inst = getInstance(image);

    inst.notes[0].view!.edit();
    expect(inst.mode).toBe('edit');

    inst.cancelEdit();

    expect(inst.mode).toBe('view');
    expect(inst.notes.length).toBe(1);
    expect(inst.notes[0].text).toBe('Keep me');
  });
});

describe('stripInternals', () => {
  test('removes view and editable from AnnotationNote', async () => {
    const { stripInternals } = await import('../src/annotate-image');
    const note = {
      id: '1',
      top: 10,
      left: 20,
      width: 50,
      height: 50,
      text: 'Test',
      editable: true,
      view: {} as unknown as AnnotateView,
    };

    const result = stripInternals(note);

    expect(result).toEqual({ id: '1', top: 10, left: 20, width: 50, height: 50, text: 'Test' });
    expect('editable' in result).toBe(false);
    expect('view' in result).toBe(false);
  });
});
