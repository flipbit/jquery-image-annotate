import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { AnnotateImage } from '../src/react';
import type { AnnotateImageRef } from '../src/react';

describe('React AnnotateImage', () => {
  describe('rendering', () => {
    it('renders an img element with src, width, height', () => {
      const { container } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} />
      );
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.getAttribute('src')).toBe('test.jpg');
      expect(img!.width).toBe(400);
      expect(img!.height).toBe(300);
    });

    it('creates annotation canvas on mount', () => {
      render(<AnnotateImage src="test.jpg" width={400} height={300} />);
      expect(document.querySelector('.image-annotate-canvas')).not.toBeNull();
    });

    it('removes canvas on unmount', () => {
      const { unmount } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} />
      );
      unmount();
      expect(document.querySelector('.image-annotate-canvas')).toBeNull();
    });

    it('renders initial notes as annotation areas', () => {
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'test', editable: true },
      ];
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes} />
      );
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(1);
    });

    it('defaults editable to true', () => {
      render(<AnnotateImage src="test.jpg" width={400} height={300} />);
      expect(document.querySelector('.image-annotate-add')).not.toBeNull();
    });

    it('respects editable=false', () => {
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} editable={false} />
      );
      expect(document.querySelector('.image-annotate-add')).toBeNull();
    });

    it('renders alt attribute on img element', () => {
      const { container } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} alt="A painting" />
      );
      const img = container.querySelector('img');
      expect(img!.getAttribute('alt')).toBe('A painting');
    });
  });

  describe('events', () => {
    it('fires onChange on mount with initial notes', () => {
      const onChange = vi.fn();
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true },
      ];
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes} onChange={onChange} />
      );
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual([
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a' },
      ]);
    });

    it('fires onSave when annotation is saved', () => {
      const onSave = vi.fn();
      const ref = createRef<AnnotateImageRef>();
      render(
        <AnnotateImage ref={ref} src="test.jpg" width={400} height={300} onSave={onSave} />
      );
      ref.current!.add();
      const textarea = document.querySelector('.image-annotate-edit-form textarea') as HTMLTextAreaElement;
      textarea.value = 'new note';
      const ok = document.querySelector('.image-annotate-edit-ok') as HTMLElement;
      ok.click();

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].text).toBe('new note');
    });

    it('fires onDelete when annotation is deleted', () => {
      const onDelete = vi.fn();
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'x', editable: true },
      ];
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes} onDelete={onDelete} />
      );
      const area = document.querySelector('.image-annotate-area') as HTMLElement;
      area.click();
      const del = document.querySelector('.image-annotate-edit-delete') as HTMLElement;
      del.click();

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete.mock.calls[0][0].id).toBe('1');
    });

    it('fires onLoad on mount', () => {
      const onLoad = vi.fn();
      render(
        <AnnotateImage src="test.jpg" width={400} height={300} onLoad={onLoad} />
      );
      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('fires onError when mount fails due to zero-dimension image', () => {
      const onError = vi.fn();
      render(
        <AnnotateImage src="test.jpg" width={0} height={0} onError={onError} />
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].type).toBe('load');
      expect(onError.mock.calls[0][0].error).toBeInstanceOf(Error);
      expect(document.querySelector('.image-annotate-canvas')).toBeNull();
    });
  });

  describe('imperative ref', () => {
    it('exposes add()', () => {
      const ref = createRef<AnnotateImageRef>();
      render(
        <AnnotateImage ref={ref} src="test.jpg" width={400} height={300} />
      );
      ref.current!.add();
      expect(document.querySelector('.image-annotate-edit-form')).not.toBeNull();
    });

    it('exposes clear()', () => {
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true },
      ];
      const ref = createRef<AnnotateImageRef>();
      render(
        <AnnotateImage ref={ref} src="test.jpg" width={400} height={300} notes={notes} />
      );
      ref.current!.clear();
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(0);
    });

    it('exposes getNotes() returning stripped notes', () => {
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true },
      ];
      const ref = createRef<AnnotateImageRef>();
      render(
        <AnnotateImage ref={ref} src="test.jpg" width={400} height={300} notes={notes} />
      );
      const result = ref.current!.getNotes();
      expect(result).toEqual([
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a' },
      ]);
      expect(result[0]).not.toHaveProperty('view');
    });
  });

  describe('prop reactivity', () => {
    it('updates annotations when notes prop changes', () => {
      const notes1 = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'first', editable: true },
      ];
      const notes2 = [
        { id: '2', top: 20, left: 20, width: 40, height: 40, text: 'second', editable: true },
        { id: '3', top: 30, left: 30, width: 40, height: 40, text: 'third', editable: false },
      ];
      const { rerender } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes1} />
      );
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(1);

      rerender(<AnnotateImage src="test.jpg" width={400} height={300} notes={notes2} />);
      expect(document.querySelectorAll('.image-annotate-area')).toHaveLength(2);
    });

    it('updates editability when editable prop changes', () => {
      const { rerender } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} editable={true} />
      );
      expect(document.querySelector('.image-annotate-add')).not.toBeNull();

      rerender(<AnnotateImage src="test.jpg" width={400} height={300} editable={false} />);
      expect(document.querySelector('.image-annotate-add')).toBeNull();
    });

    it('destroys and recreates when src changes', () => {
      const { rerender } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} />
      );
      const canvas1 = document.querySelector('.image-annotate-canvas');
      expect(canvas1).not.toBeNull();

      rerender(<AnnotateImage src="other.jpg" width={400} height={300} />);
      const canvas2 = document.querySelector('.image-annotate-canvas');
      expect(canvas2).not.toBeNull();
      expect(canvas2).not.toBe(canvas1);
    });

    it('does not throw when re-rendering with notes mutated by core', () => {
      const notes = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'a', editable: true },
      ];
      const { rerender } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes} />
      );
      // Core mutates note objects in-place (adds .view), so a re-render with the
      // same objects must not throw "Converting circular structure to JSON".
      expect(() => {
        rerender(<AnnotateImage src="test.jpg" width={400} height={300} notes={notes} />);
      }).not.toThrow();
    });

    it('does not fire onChange when notes prop changes externally', () => {
      const onChange = vi.fn();
      const notes1 = [
        { id: '1', top: 10, left: 10, width: 50, height: 50, text: 'first', editable: true },
      ];
      const notes2 = [
        { id: '2', top: 20, left: 20, width: 40, height: 40, text: 'second', editable: true },
      ];
      const { rerender } = render(
        <AnnotateImage src="test.jpg" width={400} height={300} notes={notes1} onChange={onChange} />
      );
      onChange.mockClear();

      rerender(<AnnotateImage src="test.jpg" width={400} height={300} notes={notes2} onChange={onChange} />);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
