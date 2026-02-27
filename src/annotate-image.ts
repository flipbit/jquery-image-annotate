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
  private pendingRescale = false;
  private resizeObserver?: ResizeObserver;
  private originalParent: Node | null = null;
  private originalNextSibling: Node | null = null;
  /** Natural (intrinsic) image width. */
  readonly naturalWidth: number;
  /** Natural (intrinsic) image height. */
  readonly naturalHeight: number;
  /** Current horizontal scale factor (rendered / natural). */
  scaleX: number;
  /** Current vertical scale factor (rendered / natural). */
  scaleY: number;

  /** Convert a rect from natural image coordinates to rendered (scaled) coordinates. */
  toRendered(rect: { top: number; left: number; width: number; height: number }) {
    return {
      top: rect.top * this.scaleY,
      left: rect.left * this.scaleX,
      width: rect.width * this.scaleX,
      height: rect.height * this.scaleY,
    };
  }

  /** Convert a rect from rendered (scaled) coordinates to natural image coordinates. */
  toNatural(rect: { top: number; left: number; width: number; height: number }) {
    const result = {
      top: rect.top / this.scaleY,
      left: rect.left / this.scaleX,
      width: rect.width / this.scaleX,
      height: rect.height / this.scaleY,
    };
    if (!isFinite(result.top) || !isFinite(result.left) ||
        !isFinite(result.width) || !isFinite(result.height)) {
      throw new Error('image-annotate: scale conversion produced non-finite coordinates');
    }
    return result;
  }

  /**
   * @param img - Image element to annotate. Must be in the DOM with non-zero dimensions.
   * @param options - Plugin configuration.
   */
  constructor(img: HTMLImageElement, options: AnnotateImageOptions) {
    this.options = options;
    this.handlers = createDefaultHandlers();
    this.img = img;

    // Read natural and rendered dimensions
    this.naturalWidth = img.naturalWidth || img.width;
    this.naturalHeight = img.naturalHeight || img.height;
    const rendered = img.getBoundingClientRect();
    const renderedWidth = rendered.width || img.width;
    const renderedHeight = rendered.height || img.height;

    if (this.naturalWidth === 0 || this.naturalHeight === 0) {
      throw new Error('image-annotate: image must have non-zero dimensions (is the image loaded?)');
    }

    this.scaleX = renderedWidth / this.naturalWidth;
    this.scaleY = renderedHeight / this.naturalHeight;
    this.notes = options.notes.map(n => ({ ...n }));

    // Record original DOM position for destroy restoration
    this.originalParent = img.parentNode;
    this.originalNextSibling = img.nextSibling;

    // Build canvas structure — wrap the image
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

    // Insert canvas at the image's original position, then move image inside
    if (!img.parentNode) {
      throw new Error('image-annotate: image must be in the DOM before initialization');
    }
    img.parentNode.insertBefore(this.canvas, img);
    this.canvas.appendChild(img);
    this.canvas.appendChild(this.viewOverlay);
    this.canvas.appendChild(this.editOverlay);

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

    // Set up ResizeObserver for dynamic resizing
    if (options.autoResize !== false && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        this.rescale(width, height);
      });
      this.resizeObserver.observe(this.canvas);
    }
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

    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    // Restore image to its original DOM position.
    // Guard against cases where the parent was already removed (e.g. React
    // unmount removes the container before effect cleanup runs).
    if (this.originalParent && this.originalParent.isConnected) {
      // The original next sibling may have moved (e.g. another plugin instance
      // wrapped it), so only use it as reference if it's still a child of the
      // original parent.
      const ref = this.originalNextSibling?.parentNode === this.originalParent
        ? this.originalNextSibling
        : null;
      this.originalParent.insertBefore(this.img, ref);
    }

    // Remove canvas from DOM
    this.canvas.remove();
  }

  /** Cancel the active edit (if any) and return to view mode. */
  cancelEdit(): void {
    if (this.activeEdit) {
      this.activeEdit.destroy();
      this.setMode('view');
    }
    this.flushPendingRescale();
  }

  /** Recompute scale factors, deferring if an edit is active. */
  private rescale(renderedWidth: number, renderedHeight: number): void {
    if (this.mode === 'edit') {
      this.pendingRescale = true;
      return;
    }
    this.applyRescale(renderedWidth, renderedHeight);
  }

  /** Apply new scale factors and re-render all views. */
  private applyRescale(renderedWidth: number, renderedHeight: number): void {
    const newScaleX = renderedWidth / this.naturalWidth;
    const newScaleY = renderedHeight / this.naturalHeight;

    if (newScaleX === this.scaleX && newScaleY === this.scaleY) return;

    this.scaleX = newScaleX;
    this.scaleY = newScaleY;

    this.destroyViews();
    this.createViews();
  }

  /** @internal Flush any deferred rescale after an edit completes. */
  flushPendingRescale(): void {
    if (!this.pendingRescale) return;
    this.pendingRescale = false;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.applyRescale(rect.width, rect.height);
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
