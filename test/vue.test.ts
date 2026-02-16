import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AnnotateImage } from '../src/vue';

/** Mount options that attach the component to document.body so the core plugin's
 *  DOM insertions (canvas, button) are reachable via document.querySelector(). */
const mountOpts = { attachTo: document.body };

let wrapper: ReturnType<typeof mount> | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('Vue AnnotateImage', () => {
  describe('rendering', () => {
    it('renders an img element with src, width, height', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('test.jpg');
      expect(img.element.width).toBe(400);
      expect(img.element.height).toBe(300);
    });

    it('creates annotation canvas on mount', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });

    it('removes canvas on unmount', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      wrapper.unmount();
      expect(document.querySelector('.image-annotate-canvas')).toBeNull();
    });

    it('renders initial notes as annotation areas', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'test', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(1);
    });

    it('defaults editable to true', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      expect(document.querySelector('.image-annotate-add')).not.toBeNull();
    });

    it('respects editable=false', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, editable: false },
      });
      expect(document.querySelector('.image-annotate-add')).toBeNull();
    });

    it('renders alt attribute on img element', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, alt: 'A painting' },
      });
      const img = wrapper.find('img');
      expect(img.attributes('alt')).toBe('A painting');
    });
  });

  describe('events', () => {
    it('emits change on mount with initial notes', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      const emitted = wrapper.emitted('change');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual([{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a' }]);
    });

    it('emits save when annotation is saved', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      (wrapper.vm as Record<string, () => void>).add();
      const textarea = document.querySelector('.image-annotate-edit-form textarea') as HTMLTextAreaElement;
      textarea.value = 'new note';
      const ok = document.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      const emitted = wrapper.emitted('save');
      expect(emitted).toBeTruthy();
      expect((emitted![0][0] as { text: string }).text).toBe('new note');
    });

    it('emits delete when annotation is deleted', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'x', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      const area = document.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      const del = document.querySelector('.image-annotate-edit-delete') as HTMLElement;
      del.click();

      const emitted = wrapper.emitted('delete');
      expect(emitted).toBeTruthy();
      expect((emitted![0][0] as { id: string }).id).toBe('1');
    });

    it('emits load on mount', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      expect(wrapper.emitted('load')).toBeTruthy();
    });

    it('emits error when mount fails due to zero-dimension image', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 0, height: 0 },
      });
      const emitted = wrapper.emitted('error');
      expect(emitted).toBeTruthy();
      expect((emitted![0][0] as { type: string }).type).toBe('load');
      expect((emitted![0][0] as { error: Error }).error).toBeInstanceOf(Error);
      expect(document.querySelector('.image-annotate-canvas')).toBeNull();
    });
  });

  describe('exposed methods', () => {
    it('exposes add()', () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      (wrapper.vm as Record<string, () => void>).add();
      expect(document.querySelector('.image-annotate-edit-form')).not.toBeNull();
    });

    it('exposes clear()', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      (wrapper.vm as Record<string, () => void>).clear();
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(0);
    });

    it('exposes getNotes() returning stripped notes', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      const result = (wrapper.vm as Record<string, () => unknown>).getNotes() as Array<Record<string, unknown>>;
      expect(result).toEqual([{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a' }]);
      expect(result[0]).not.toHaveProperty('view');
    });

    it('exposes reactive notes ref', () => {
      const notes = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes },
      });
      const vm = wrapper.vm as Record<string, unknown>;
      expect(vm.notes).toEqual([{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a' }]);
    });
  });

  describe('prop reactivity', () => {
    it('updates annotations when notes prop changes', async () => {
      const notes1 = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'first', editable: true }];
      const notes2 = [
        { id: '2', top: 20, left: 20, width: 40, height: 40, text: 'second', editable: true },
        { id: '3', top: 30, left: 30, width: 40, height: 40, text: 'third', editable: false },
      ];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes: notes1 },
      });
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(1);

      await wrapper.setProps({ notes: notes2 });
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(2);
    });

    it('updates editability when editable prop changes', async () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, editable: true },
      });
      expect(document.querySelector('.image-annotate-add')).not.toBeNull();

      await wrapper.setProps({ editable: false });
      expect(document.querySelector('.image-annotate-add')).toBeNull();
    });

    it('destroys and recreates when src changes', async () => {
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300 },
      });
      const canvas1 = document.querySelector('.image-annotate-canvas');
      expect(canvas1).not.toBeNull();

      await wrapper.setProps({ src: 'other.jpg' });
      const canvas2 = document.querySelector('.image-annotate-canvas');
      expect(canvas2).not.toBeNull();
      expect(canvas2).not.toBe(canvas1);
    });

    it('does not emit change when notes prop changes externally', async () => {
      const notes1 = [{ id: '1', top: 10, left: 10, width: 50, height: 50, text: 'first', editable: true }];
      const notes2 = [{ id: '2', top: 20, left: 20, width: 40, height: 40, text: 'second', editable: true }];
      wrapper = mount(AnnotateImage, {
        ...mountOpts,
        props: { src: 'test.jpg', width: 400, height: 300, notes: notes1 },
      });
      // Clear events from mount
      wrapper.emitted().change?.splice(0);

      await wrapper.setProps({ notes: notes2 });
      expect(wrapper.emitted('change') ?? []).toHaveLength(0);
    });
  });
});
