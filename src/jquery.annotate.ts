import { AnnotateImage } from './annotate-image';
import { DEFAULT_LABELS } from './types';
import type { AnnotateImageOptions } from './types';

declare const $: JQueryStatic;

declare global {
  interface JQuery {
    annotateImage(optionsOrMethod?: Partial<AnnotateImageOptions> | string): this;
  }
}

const defaults: AnnotateImageOptions = {
  editable: true,
  notes: [],
  labels: { ...DEFAULT_LABELS },
};

/**
 * jQuery plugin entry point for image annotation.
 *
 * Call with an options object to initialize the plugin on the selected image,
 * or pass `'destroy'` to tear down the annotation layer and restore the image.
 *
 * @example
 * // Initialize
 * $('img').annotateImage({ editable: true, notes: [] });
 * // Destroy
 * $('img').annotateImage('destroy');
 */
$.fn.annotateImage = function (optionsOrMethod?: Partial<AnnotateImageOptions> | string) {
  if (optionsOrMethod === 'destroy') {
    const instance = this.data('annotateImage') as AnnotateImage | undefined;
    if (instance) {
      instance.destroy();
      this.removeData('annotateImage');
    }
    return this;
  }

  const userOpts = optionsOrMethod as Partial<AnnotateImageOptions>;
  const opts = { ...defaults, ...userOpts, labels: { ...DEFAULT_LABELS, ...userOpts?.labels } };
  const img = this[0] as HTMLImageElement;
  const instance = new AnnotateImage(img, opts);
  this.data('annotateImage', instance);
  return this;
};
