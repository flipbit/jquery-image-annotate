import type { AnnotationNote, InteractionHandlers } from './types';
import type { AnnotateImage } from './annotate-image';
import { stripInternals } from './annotate-image';
import { AnnotateView, readInlinePosition, readInlineSize } from './annotate-view';

const DEFAULT_NOTE_TOP = 30;
const DEFAULT_NOTE_LEFT = 30;
const DEFAULT_NOTE_WIDTH = 30;
const DEFAULT_NOTE_HEIGHT = 30;

/**
 * Edit mode controller for a single annotation.
 *
 * Creates a draggable/resizable area with a text form, and handles
 * save, delete, and cancel actions through the parent AnnotateImage.
 */
export class AnnotateEdit {
  readonly image: AnnotateImage;
  readonly area: HTMLElement;
  readonly form: HTMLDivElement;
  readonly textarea: HTMLTextAreaElement;
  note: AnnotationNote;
  private handlers: InteractionHandlers;
  private busy = false;

  /**
   * @param image - The parent AnnotateImage controller.
   * @param note - Existing note to edit, or omit to create a new annotation.
   * @param existingView - The view being edited (for updates); omit for new annotations.
   */
  constructor(image: AnnotateImage, note?: AnnotationNote, existingView?: AnnotateView) {
    this.image = image;
    this.handlers = image.handlers;

    if (note) {
      this.note = note;
    } else {
      this.note = {
        id: 'new',
        top: DEFAULT_NOTE_TOP,
        left: DEFAULT_NOTE_LEFT,
        width: DEFAULT_NOTE_WIDTH,
        height: DEFAULT_NOTE_HEIGHT,
        text: '',
        editable: true,
      };
    }

    // Set area (reuse the existing edit-area element inside the edit overlay)
    this.area = image.editOverlay.querySelector('.image-annotate-edit-area') as HTMLElement;
    this.area.style.height = this.note.height + 'px';
    this.area.style.width = this.note.width + 'px';
    this.area.style.left = this.note.left + 'px';
    this.area.style.top = this.note.top + 'px';

    // Create the form
    this.form = document.createElement('div');
    this.form.className = 'image-annotate-edit-form';
    const formEl = document.createElement('form');
    this.textarea = document.createElement('textarea');
    this.textarea.name = 'text';
    this.textarea.rows = 3;
    this.textarea.cols = 30;
    this.textarea.value = this.note.text;
    const placeholder = this.image.options.labels?.placeholder ?? '';
    if (placeholder) {
      this.textarea.placeholder = placeholder;
    }
    formEl.appendChild(this.textarea);
    this.form.appendChild(formEl);

    this.area.appendChild(this.form);

    // Prevent pointer events on the form from triggering the area's drag handler
    this.form.addEventListener('pointerdown', (e) => e.stopPropagation());

    // Make area draggable/resizable via injected handlers
    const area = this.area;
    const applyRect = (rect: { left: number; top: number; width: number; height: number }) => {
      area.style.left = rect.left + 'px';
      area.style.top = rect.top + 'px';
      area.style.width = rect.width + 'px';
      area.style.height = rect.height + 'px';
    };
    this.handlers.makeResizable(area, {
      containment: image.canvas,
      onResize: applyRect,
      onStop: applyRect,
    });
    this.handlers.makeDraggable(area, {
      containment: image.canvas,
      onDrag: (pos) => {
        area.style.left = pos.left + 'px';
        area.style.top = pos.top + 'px';
      },
      onStop: (pos) => {
        area.style.left = pos.left + 'px';
        area.style.top = pos.top + 'px';
      },
    });

    this.textarea.focus();

    this.form.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cancelBtn = this.form.querySelector('.image-annotate-edit-close') as HTMLElement | null;
        if (cancelBtn) cancelBtn.click();
      }
    });

    // Button row — flex container for save/delete/cancel
    const buttonRow = document.createElement('div');
    buttonRow.className = 'image-annotate-edit-buttons';
    this.form.appendChild(buttonRow);

    this.addSaveButton(buttonRow, existingView);
    if (existingView) {
      this.addDeleteButton(buttonRow, existingView);
    }
    this.addCancelButton(buttonRow);
  }

  /** Tear down the edit form and interaction handlers. */
  destroy(): void {
    this.image.activeEdit = null;
    this.handlers.destroyResizable(this.area);
    this.handlers.destroyDraggable(this.area);
    this.area.style.height = '';
    this.area.style.width = '';
    this.area.style.left = '';
    this.area.style.top = '';
    this.form.remove();
  }

  private addSaveButton(container: HTMLElement, existingView?: AnnotateView): void {
    const ok = document.createElement('button');
    ok.className = 'image-annotate-edit-ok';
    ok.textContent = this.image.options.labels?.save ?? 'OK';
    ok.type = 'button';

    ok.addEventListener('click', () => {
      if (this.busy) return;

      const text = this.textarea.value;

      const commitSave = () => {
        this.image.setMode('view');
        if (existingView) {
          existingView.resetPosition(this, text);
        } else {
          this.note.editable = true;
          const view = new AnnotateView(this.image, this.note);
          view.resetPosition(this, text);
          this.image.notes.push(this.note);
        }
        this.image.notifySave(stripInternals(this.note));
        this.destroy();
      };

      // Update note from current area position
      const pos = readInlinePosition(this.area);
      const size = readInlineSize(this.area);
      this.note.top = pos.top;
      this.note.left = pos.left;
      this.note.width = size.width;
      this.note.height = size.height;
      this.note.text = text;

      if (this.image.api.save) {
        this.busy = true;
        this.image.api
          .save(stripInternals(this.note))
          .then((result) => {
            if (result.annotation_id != null) {
              this.note.id = result.annotation_id;
            }
            commitSave();
          })
          .catch((err: unknown) => {
            this.busy = false;
            const error = err instanceof Error ? err : new Error(String(err));
            this.image.reportError({ type: 'save', error, note: this.note });
          });
      } else {
        commitSave();
      }
    });

    container.appendChild(ok);
  }

  private addDeleteButton(container: HTMLElement, view: AnnotateView): void {
    const del = document.createElement('button');
    del.className = 'image-annotate-edit-delete';
    del.textContent = this.image.options.labels?.delete ?? 'Delete';
    del.type = 'button';

    del.addEventListener('click', () => {
      if (this.busy) return;

      const removeNote = () => {
        this.image.setMode('view');
        this.destroy();
        view.destroy();
        const idx = this.image.notes.indexOf(this.note);
        if (idx !== -1) this.image.notes.splice(idx, 1);
        this.image.notifyDelete(stripInternals(this.note));
      };

      if (this.image.api.delete) {
        this.busy = true;
        this.image.api
          .delete(stripInternals(this.note))
          .then(() => {
            removeNote();
          })
          .catch((err: unknown) => {
            this.busy = false;
            const error = err instanceof Error ? err : new Error(String(err));
            this.image.reportError({ type: 'delete', error, note: this.note });
          });
      } else {
        removeNote();
      }
    });

    container.appendChild(del);
  }

  private addCancelButton(container: HTMLElement): void {
    const cancel = document.createElement('button');
    cancel.className = 'image-annotate-edit-close';
    cancel.textContent = this.image.options.labels?.cancel ?? 'Cancel';
    cancel.type = 'button';

    cancel.addEventListener('click', () => {
      this.image.cancelEdit();
    });

    container.appendChild(cancel);
  }
}
