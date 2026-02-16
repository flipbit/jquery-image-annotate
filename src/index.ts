import { AnnotateImage } from './annotate-image';
import { DEFAULT_LABELS } from './types';
import type {
  AnnotationNote,
  AnnotateImageOptions,
  AnnotateApi,
  AnnotateErrorContext,
  SaveResult,
  NoteData,
  Labels,
} from './types';

export { AnnotateImage, DEFAULT_LABELS };
export type { AnnotationNote, AnnotateImageOptions, AnnotateApi, AnnotateErrorContext, SaveResult, NoteData, Labels };

const defaults: AnnotateImageOptions = {
  editable: true,
  notes: [],
  labels: { ...DEFAULT_LABELS },
};

/**
 * Create an annotation layer on an image element.
 *
 * The image must already be loaded and have non-zero dimensions.
 * Returns the AnnotateImage instance that manages the annotation lifecycle.
 *
 * @param img - The image element to annotate. Must be in the DOM with non-zero dimensions.
 * @param options - Plugin configuration (editable, notes, api callbacks, etc.).
 * @returns The AnnotateImage instance.
 */
export function annotate(img: HTMLImageElement, options?: Partial<AnnotateImageOptions>): AnnotateImage {
  const merged = { ...defaults, ...options, labels: { ...DEFAULT_LABELS, ...options?.labels } };
  return new AnnotateImage(img, merged);
}
