import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { AnnotateImage as AnnotateImageCore } from './annotate-image';
import type { AnnotationNote, NoteData, AnnotateErrorContext } from './types';

/** Props for the AnnotateImage React component. */
export interface AnnotateImageProps {
  /** Image source URL. */
  src: string;
  /** Image width in pixels. Required if image may not be loaded yet. */
  width?: number;
  /** Image height in pixels. Required if image may not be loaded yet. */
  height?: number;
  /** Image alt text for accessibility. */
  alt?: string;
  /** Annotations to render. */
  notes?: AnnotationNote[];
  /** Enable annotation editing. Default: true. */
  editable?: boolean;
  /** Called after any notes mutation. */
  onChange?: (notes: NoteData[]) => void;
  /** Called after a note is saved (new or edited). */
  onSave?: (note: NoteData) => void;
  /** Called after a note is deleted. */
  onDelete?: (note: NoteData) => void;
  /** Called after notes are loaded. */
  onLoad?: (notes: NoteData[]) => void;
  /** Called when an operation fails. */
  onError?: (context: AnnotateErrorContext) => void;
}

/** Imperative methods exposed via ref. */
export interface AnnotateImageRef {
  /** Enter add-note mode. */
  add(): void;
  /** Remove all annotations. */
  clear(): void;
  /** Return current annotations (internal fields stripped). */
  getNotes(): NoteData[];
}

/**
 * React component for image annotation.
 * Wraps the vanilla AnnotateImage core with reactive state and event callbacks.
 *
 * @remarks SSR-safe — renders a plain `<img>` on the server. DOM manipulation
 * only runs in useEffect (client-side).
 */
export const AnnotateImage = forwardRef<AnnotateImageRef, AnnotateImageProps>(
  function AnnotateImage(props, ref) {
    const imgRef = useRef<HTMLImageElement>(null);
    const instanceRef = useRef<AnnotateImageCore | null>(null);
    const mountedRef = useRef(false);

    // Keep refs in sync so the core instance always calls the latest callbacks
    const onChangeRef = useRef(props.onChange);
    const onSaveRef = useRef(props.onSave);
    const onDeleteRef = useRef(props.onDelete);
    const onLoadRef = useRef(props.onLoad);
    const onErrorRef = useRef(props.onError);
    useLayoutEffect(() => {
      onChangeRef.current = props.onChange;
      onSaveRef.current = props.onSave;
      onDeleteRef.current = props.onDelete;
      onLoadRef.current = props.onLoad;
      onErrorRef.current = props.onError;
    });

    // Mount/unmount effect — keyed on src (new image = new instance)
    useEffect(() => {
      if (!imgRef.current) return;

      try {
        const instance = new AnnotateImageCore(imgRef.current, {
          editable: props.editable ?? true,
          notes: props.notes ? props.notes.slice() : [],
          onChange: (notes) => onChangeRef.current?.(notes),
          onSave: (note) => onSaveRef.current?.(note),
          onDelete: (note) => onDeleteRef.current?.(note),
          onLoad: (notes) => onLoadRef.current?.(notes),
          onError: (ctx) => onErrorRef.current?.(ctx),
        });
        instanceRef.current = instance;
        mountedRef.current = true;

        return () => {
          instance.destroy();
          instanceRef.current = null;
          mountedRef.current = false;
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onErrorRef.current?.({ type: 'load', error });
      }
    }, [props.src]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update notes when prop changes (skip initial mount — handled by constructor)
    const serializedNotes = JSON.stringify(props.notes ?? []);
    useEffect(() => {
      if (!mountedRef.current || !instanceRef.current) return;
      instanceRef.current.setNotes(props.notes ? props.notes.slice() : []);
    }, [serializedNotes]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update editable when prop changes (skip initial mount — handled by constructor)
    const editable = props.editable ?? true;
    useEffect(() => {
      if (!mountedRef.current || !instanceRef.current) return;
      instanceRef.current.setEditable(editable);
    }, [editable]);

    useImperativeHandle(ref, () => ({
      add() { instanceRef.current?.add(); },
      clear() { instanceRef.current?.clear(); },
      getNotes() { return instanceRef.current?.getNotes() ?? []; },
    }));

    return <img ref={imgRef} src={props.src} width={props.width} height={props.height} alt={props.alt} />;
  },
);
