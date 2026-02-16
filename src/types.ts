import type { AnnotateView } from './annotate-view';

export interface AnnotationNote {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  text: string;
  editable: boolean;
  view?: AnnotateView;
}

/** Response from a save operation. */
export interface SaveResult {
  annotation_id?: string;
}

/**
 * Per-note data passed to save/delete callbacks.
 * AnnotationNote without internal fields (view, editable).
 */
export type NoteData = Omit<AnnotationNote, 'view' | 'editable'>;

export interface AnnotateErrorContext {
  type: 'load' | 'save' | 'delete';
  error: Error;
  note?: AnnotationNote;
}

/** Transport configuration for server persistence. */
export interface AnnotateApi {
  /**
   * Load annotations from the server.
   * - String: GET request to this URL, expects AnnotationNote[] JSON response.
   * - Function: called on init, must resolve with the annotations array.
   */
  load?: string | (() => Promise<AnnotationNote[]>);

  /**
   * Persist an annotation to the server.
   * - String: POST request to this URL with JSON body, expects SaveResult response.
   * - Function: called with note data, must resolve with SaveResult on success.
   */
  save?: string | ((note: NoteData) => Promise<SaveResult>);

  /**
   * Delete an annotation from the server.
   * - String: POST request to this URL with JSON body.
   * - Function: called with note data, must resolve on success.
   */
  delete?: string | ((note: NoteData) => Promise<void>);
}

/** Normalized transport — all functions, no strings. Used internally. */
export interface NormalizedApi {
  load?: () => Promise<AnnotationNote[]>;
  save?: (note: NoteData) => Promise<SaveResult>;
  delete?: (note: NoteData) => Promise<void>;
}

/** Configurable UI labels. All fields optional; missing fields use defaults. */
export interface Labels {
  /** "Add Note" button text and tooltip. Default: "Add Note". */
  addNote?: string;
  /** Save button text. Default: "OK". */
  save?: string;
  /** Delete button text. Default: "Delete". */
  delete?: string;
  /** Cancel button text. Default: "Cancel". */
  cancel?: string;
  /** Textarea placeholder text. Default: "" (no placeholder). */
  placeholder?: string;
}

/** Built-in defaults for all UI labels. */
export const DEFAULT_LABELS: Required<Labels> = {
  addNote: 'Add Note',
  save: 'OK',
  delete: 'Delete',
  cancel: 'Cancel',
  placeholder: '',
};

export interface AnnotateImageOptions {
  /** Enable annotation editing. Default: true. */
  editable: boolean;

  /** Static annotation data to render on init. Default: []. */
  notes: AnnotationNote[];

  /** Server persistence configuration. Omit for static-only mode. */
  api?: AnnotateApi;

  /** Called when a load/save/delete operation fails. */
  onError?: (context: AnnotateErrorContext) => void;

  /** Called after any notes mutation (load, save, delete, clear). */
  onChange?: (notes: NoteData[]) => void;

  /** Called after a note is saved (new or edited). */
  onSave?: (note: NoteData) => void;

  /** Called after a note is deleted. */
  onDelete?: (note: NoteData) => void;

  /** Called after notes are loaded (initial or via api.load). */
  onLoad?: (notes: NoteData[]) => void;

  /** UI label overrides. Missing fields use built-in defaults. */
  labels?: Labels;
}

export interface DragCallbacks {
  containment?: HTMLElement;
  onDrag?: (pos: { left: number; top: number }) => void;
  onStop?: (pos: { left: number; top: number }) => void;
}

export interface ResizeCallbacks {
  containment?: HTMLElement;
  onResize?: (rect: { left: number; top: number; width: number; height: number }) => void;
  onStop?: (rect: { left: number; top: number; width: number; height: number }) => void;
}

export interface InteractionHandlers {
  makeDraggable: (el: HTMLElement, opts: DragCallbacks) => void;
  makeResizable: (el: HTMLElement, opts: ResizeCallbacks) => void;
  destroyDraggable: (el: HTMLElement) => void;
  destroyResizable: (el: HTMLElement) => void;
}
