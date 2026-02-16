import type {
  AnnotationNote,
  AnnotateImageOptions,
  AnnotateApi,
  NormalizedApi,
  NoteData,
  SaveResult,
  InteractionHandlers,
  AnnotateErrorContext,
} from './types';
import { AnnotateView } from './annotate-view';
import { AnnotateEdit } from './annotate-edit';
import { createDefaultHandlers } from './interactions';

/** Strip internal fields (view, editable) before passing to callbacks. */
export function stripInternals(note: AnnotationNote): NoteData {
  const { view: _view, editable: _editable, ...data } = note;
  return data;
}

/** Normalize api config: convert string URLs to default fetch functions. */
export function normalizeApi(api: AnnotateApi): NormalizedApi {
  return {
    load: typeof api.load === 'string' ? defaultLoader(api.load) : api.load,
    save: typeof api.save === 'string' ? defaultSaver(api.save) : api.save,
    delete: typeof api.delete === 'string' ? defaultDeleter(api.delete) : api.delete,
  };
}

function defaultLoader(url: string): () => Promise<AnnotationNote[]> {
  return () =>
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Load failed (HTTP ${r.status})`);
      return r.json();
    });
}

function defaultSaver(url: string): (note: NoteData) => Promise<SaveResult> {
  return (note) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    }).then((r) => {
      if (!r.ok) throw new Error(`Save failed (HTTP ${r.status})`);
      return r.json();
    });
}

function defaultDeleter(url: string): (note: NoteData) => Promise<void> {
  return (note) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    }).then((r) => {
      if (!r.ok) throw new Error(`Delete failed (HTTP ${r.status})`);
    });
}

/**
 * Core annotation controller for a single image.
 *
 * Wraps the target image in a canvas overlay, manages annotation views
 * and edit mode, and coordinates persistence through the configured API.
 */
export class AnnotateImage {
  readonly img: HTMLImageElement;
  readonly canvas: HTMLDivElement;
  readonly viewOverlay: HTMLDivElement;
  readonly editOverlay: HTMLDivElement;
  button: HTMLButtonElement | undefined;
  notes: AnnotationNote[];
  private _mode: 'view' | 'edit' = 'view';
  options: AnnotateImageOptions;
  /** Normalized transport API — all functions, no strings. */
  api: NormalizedApi;
  handlers: InteractionHandlers;
  activeEdit: AnnotateEdit | null = null;
  private destroyed = false;

  /**
   * @param img - Image element to annotate. Must be in the DOM with non-zero dimensions.
   * @param options - Plugin configuration.
   */
  constructor(img: HTMLImageElement, options: AnnotateImageOptions) {
    this.options = options;
    this.handlers = createDefaultHandlers();
    this.img = img;
    const width = img.width;
    const height = img.height;
    if (width === 0 || height === 0) {
      throw new Error('image-annotate: image must have non-zero dimensions (is the image loaded?)');
    }
    this.notes = options.notes.map(n => ({ ...n }));

    // Build canvas structure
    this.canvas = document.createElement('div');
    this.canvas.className = 'image-annotate-canvas';

    this.viewOverlay = document.createElement('div');
    this.viewOverlay.className = 'image-annotate-view';

    this.editOverlay = document.createElement('div');
    this.editOverlay.className = 'image-annotate-edit';
    this.editOverlay.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'image-annotate-edit-area';
    this.editOverlay.appendChild(editArea);

    this.canvas.appendChild(this.viewOverlay);
    this.canvas.appendChild(this.editOverlay);

    // Insert canvas after the image
    if (!img.parentNode) {
      throw new Error('image-annotate: image must be in the DOM before initialization');
    }
    img.parentNode.insertBefore(this.canvas, img.nextSibling);

    // Set dimensions and background
    this.canvas.style.height = height + 'px';
    this.canvas.style.width = width + 'px';
    this.canvas.style.backgroundImage = 'url("' + img.src + '")';
    this.viewOverlay.style.height = height + 'px';
    this.viewOverlay.style.width = width + 'px';
    this.editOverlay.style.height = height + 'px';
    this.editOverlay.style.width = width + 'px';

    // Load notes
    this.api = this.options.api ? normalizeApi(this.options.api) : {};
    if (this.api.load) {
      this.loadFromApi();
    } else {
      this.load();
    }

    // Add Note button
    if (this.options.editable) {
      this.createButton();
    }

    // Hide original image
    img.style.display = 'none';
  }

  /** Current interaction mode — 'view' for browsing, 'edit' when an annotation is being created or modified. */
  get mode(): 'view' | 'edit' {
    return this._mode;
  }

  /** Switch between view and edit mode, toggling overlay visibility. */
  setMode(newMode: 'view' | 'edit'): void {
    this._mode = newMode;
    if (newMode === 'edit') {
      this.canvas.classList.add('image-annotate-editing');
      this.editOverlay.style.display = 'block';
    } else {
      this.canvas.classList.remove('image-annotate-editing');
      this.editOverlay.style.display = 'none';
    }
  }

  /** Return current notes with internal fields stripped. */
  getNotes(): NoteData[] {
    return this.notes.map(stripInternals);
  }

  /** @internal Notify that the notes collection changed. */
  notifyChange(): void {
    this.options.onChange?.(this.getNotes());
  }

  /** @internal Notify that a note was saved, then fire onChange. */
  notifySave(note: NoteData): void {
    this.options.onSave?.(note);
    this.notifyChange();
  }

  /** @internal Notify that a note was deleted, then fire onChange. */
  notifyDelete(note: NoteData): void {
    this.options.onDelete?.(note);
    this.notifyChange();
  }

  /** @internal Notify that notes were loaded, then fire onChange. */
  notifyLoad(): void {
    this.options.onLoad?.(this.getNotes());
    this.notifyChange();
  }

  private destroyViews(): void {
    this.cancelEdit();
    for (const note of this.notes) {
      note.view?.destroy();
    }
  }

  private createViews(): void {
    for (const note of this.notes) {
      note.view = new AnnotateView(this, note);
    }
  }

  /** Rebuild annotation views from the current notes array. */
  load(): void {
    this.destroyViews();
    this.createViews();
    this.notifyLoad();
  }

  /** Remove all annotations and their views. */
  clear(): void {
    this.destroyViews();
    this.notes = [];
    this.notifyChange();
  }

  /** Tear down the plugin: remove canvas, restore the original image. Idempotent. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Destroy views without firing onChange
    this.destroyViews();
    this.notes = [];

    // Remove "Add Note" button
    if (this.button) {
      this.button.remove();
    }

    // Remove canvas from DOM
    this.canvas.remove();

    // Restore original image
    this.img.style.display = '';
  }

  /** Cancel the active edit (if any) and return to view mode. */
  cancelEdit(): void {
    if (this.activeEdit) {
      this.activeEdit.destroy();
      this.setMode('view');
    }
  }

  /** Replace all annotations with new data. Does not fire lifecycle callbacks. */
  setNotes(notes: AnnotationNote[]): void {
    if (this.destroyed) return;
    this.destroyViews();
    this.notes = notes.map(n => ({ ...n }));
    this.createViews();
  }

  /** Toggle editing mode. Creates or removes Add Note button and rebuilds views. Does not fire lifecycle callbacks. */
  setEditable(editable: boolean): void {
    if (this.destroyed) return;
    if (this.options.editable === editable) return;
    this.options.editable = editable;

    if (editable && !this.button) {
      this.createButton();
    } else if (!editable && this.button) {
      this.button.remove();
      this.button = undefined;
    }

    this.destroyViews();
    this.createViews();
  }

  private createButton(): void {
    this.button = document.createElement('button');
    this.button.className = 'image-annotate-add';
    this.button.title = this.options.labels?.addNote ?? 'Add Note';
    this.button.type = 'button';
    this.button.addEventListener('click', () => {
      this.add();
    });
    this.canvas.appendChild(this.button);
  }

  /** Report an API error via the onError callback, or log to console if none configured. */
  reportError(context: AnnotateErrorContext): void {
    if (this.options.onError) {
      this.options.onError(context);
    } else {
      // eslint-disable-next-line no-console
      console.error(`image-annotate: ${context.type} failed`, context.error);
    }
  }

  /** Load annotations from the server via api.load. */
  private loadFromApi(): void {
    if (!this.api.load) return;
    this.api
      .load()
      .then((notes) => {
        this.destroyViews();
        this.notes = notes;
        this.createViews();
        this.notifyLoad();
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        this.reportError({ type: 'load', error });
      });
  }

  /**
   * Enter edit mode to create a new annotation.
   * @returns true if edit mode was entered, false if already editing.
   */
  add(): boolean {
    if (this.mode === 'view') {
      this.setMode('edit');

      this.activeEdit = new AnnotateEdit(this);
      return true;
    }
    return false;
  }
}
