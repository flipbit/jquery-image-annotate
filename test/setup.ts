import jquery from 'jquery';
import { afterEach, vi } from 'vitest';
import type { AnnotateImage } from '../src/annotate-image.ts';
import type { AnnotateImageOptions } from '../src/types.ts';

// Make jQuery available globally so the plugin adapter can find it
vi.stubGlobal('jQuery', jquery);
vi.stubGlobal('$', jquery);

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/**
 * Returns the AnnotateImage instance stored on a jQuery image object.
 */
export function getInstance(jqObj: JQuery): AnnotateImage {
  return jqObj.data('annotateImage');
}

/**
 * Creates an image element in the DOM and initializes the plugin.
 * Sets explicit dimensions since jsdom doesn't load real images.
 */
export function createTestImage(options: Partial<AnnotateImageOptions> = {}): JQuery {
  document.body.innerHTML = '';
  const img = $('<img id="test-img" width="400" height="300" src="test.jpg" />');
  $(document.body).append(img);

  const defaults = {
    editable: true,
    notes: [],
  };

  img.annotateImage({ ...defaults, ...options });
  return img;
}

/**
 * Creates an image element for testing the vanilla core API (no jQuery).
 */
export function createTestImageVanilla(): HTMLImageElement {
  document.body.innerHTML = '';
  const img = document.createElement('img');
  img.src = 'test.jpg';
  img.width = 400;
  img.height = 300;
  document.body.appendChild(img);
  return img;
}
