import type { AnnotationNote } from './types';
import type { AnnotateImage } from './annotate-image';
import { AnnotateEdit } from './annotate-edit';

/** Read position from inline styles (jsdom has no layout engine). */
export function readInlinePosition(el: HTMLElement) {
  return {
    left: parseInt(el.style.left) || 0,
    top: parseInt(el.style.top) || 0,
  };
}

/** Read dimensions from inline styles, falling back to offsetWidth/offsetHeight. */
export function readInlineSize(el: HTMLElement) {
  return {
    width: parseInt(el.style.width) || el.offsetWidth,
    height: parseInt(el.style.height) || el.offsetHeight,
  };
}

/**
 * Renders a single annotation as a positioned area with a hover tooltip.
 * Editable annotations support click-to-edit to open the edit form.
 */
export class AnnotateView {
  readonly image: AnnotateImage;
  readonly area: HTMLDivElement;
  readonly tooltip: HTMLDivElement;
  note: AnnotationNote;
  editable: boolean;

  /**
   * @param image - The parent AnnotateImage controller.
   * @param note - Annotation data to display.
   */
  constructor(image: AnnotateImage, note: AnnotationNote) {
    this.image = image;
    this.note = note;
    this.editable = !!(note.editable && image.options.editable);

    // Create the area element
    this.area = document.createElement('div');
    this.area.className = 'image-annotate-area' + (this.editable ? ' image-annotate-area-editable' : '');
    const innerDiv = document.createElement('div');
    this.area.appendChild(innerDiv);
    image.viewOverlay.insertBefore(this.area, image.viewOverlay.firstChild);

    // Create the tooltip (was called "form" in old code)
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'image-annotate-note';
    this.tooltip.textContent = note.text;
    this.tooltip.style.display = 'none';
    this.area.appendChild(this.tooltip);

    // Position
    this.setPosition();

    // Hover behavior
    this.area.addEventListener('mouseenter', () => this.show());
    this.area.addEventListener('mouseleave', () => this.hide());

    // Click-to-edit
    if (this.editable) {
      this.area.setAttribute('tabindex', '0');
      this.area.setAttribute('role', 'button');
      this.area.addEventListener('click', () => this.edit());
      this.area.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.edit();
        }
      });
    }
  }

  /** Apply the note's position and dimensions to the area element. */
  setPosition(): void {
    const innerDiv = this.area.firstElementChild as HTMLElement;
    innerDiv.style.height = this.note.height + 'px';
    innerDiv.style.width = this.note.width + 'px';
    this.area.style.left = this.note.left + 'px';
    this.area.style.top = this.note.top + 'px';
  }

  /** Update the view's position, size, and text from the edit area after a save. */
  resetPosition(editable: { area: HTMLElement; note: AnnotationNote }, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'none';

    const areaPos = readInlinePosition(editable.area);
    const areaSize = readInlineSize(editable.area);

    // Resize inner div
    const innerDiv = this.area.firstElementChild as HTMLElement;
    innerDiv.style.height = areaSize.height + 'px';
    innerDiv.style.width = areaSize.width + 'px';
    this.area.style.left = areaPos.left + 'px';
    this.area.style.top = areaPos.top + 'px';

    // Save new position to note
    this.note.top = areaPos.top;
    this.note.left = areaPos.left;
    this.note.height = areaSize.height;
    this.note.width = areaSize.width;
    this.note.text = text;
    this.note.id = editable.note.id;
    this.editable = true;
  }

  /** Show the tooltip and apply hover styling. */
  show(): void {
    this.tooltip.style.display = 'block';
    if (!this.editable) {
      this.area.classList.add('image-annotate-area-hover');
    } else {
      this.area.classList.add('image-annotate-area-editable-hover');
    }
  }

  /** Hide the tooltip and remove hover styling. */
  hide(): void {
    this.tooltip.style.display = 'none';
    this.area.classList.remove('image-annotate-area-hover');
    this.area.classList.remove('image-annotate-area-editable-hover');
  }

  /** Remove the annotation's DOM elements. */
  destroy(): void {
    this.area.remove();
    this.tooltip.remove();
  }

  /** Open the edit form for this annotation (only if in view mode). */
  edit(): void {
    if (this.image.mode === 'view') {
      this.image.setMode('edit');

      this.image.activeEdit = new AnnotateEdit(this.image, this.note, this);
    }
  }
}
