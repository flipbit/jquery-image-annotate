import { describe, test, expect } from 'vitest';
import { clampNote, clampNotes } from '../src/positioning';

describe('clampNote — boundary clamping', () => {
  const W = 400;
  const H = 300;

  test('note fully inside image is unchanged', () => {
    const note = { top: 10, left: 20, width: 50, height: 50 };
    expect(clampNote(note, W, H)).toEqual(note);
  });

  test('note exceeding right edge is clamped (left moves left)', () => {
    const note = { top: 10, left: 380, width: 50, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.left).toBe(350); // 400 - 50
    expect(result.width).toBe(50);
  });

  test('note exceeding bottom edge is clamped (top moves up)', () => {
    const note = { top: 280, left: 10, width: 50, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.top).toBe(250); // 300 - 50
    expect(result.height).toBe(50);
  });

  test('negative left is clamped to 0', () => {
    const note = { top: 10, left: -20, width: 50, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.left).toBe(0);
  });

  test('negative top is clamped to 0', () => {
    const note = { top: -10, left: 20, width: 50, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.top).toBe(0);
  });

  test('width larger than image is clamped to image width', () => {
    const note = { top: 10, left: 20, width: 500, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.width).toBe(400);
    expect(result.left).toBe(0); // forced to 0 since width == image width
  });

  test('height larger than image is clamped to image height', () => {
    const note = { top: 10, left: 20, width: 50, height: 400 };
    const result = clampNote(note, W, H);
    expect(result.height).toBe(300);
    expect(result.top).toBe(0);
  });

  test('note completely outside image (top > image height) is clamped inside', () => {
    const note = { top: 500, left: 600, width: 50, height: 50 };
    const result = clampNote(note, W, H);
    expect(result.top).toBe(250); // 300 - 50
    expect(result.left).toBe(350); // 400 - 50
  });

  test('note at exact image bounds is unchanged', () => {
    const note = { top: 0, left: 0, width: 400, height: 300 };
    expect(clampNote(note, W, H)).toEqual(note);
  });

  test('both width and height larger than image, position outside', () => {
    const note = { top: 120, left: 10, width: 500, height: 400 };
    const result = clampNote(note, W, H);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.left).toBe(0);
    expect(result.top).toBe(0);
  });

  test('does not mutate the input object', () => {
    const note = { top: 500, left: 600, width: 50, height: 50 };
    const original = { ...note };
    clampNote(note, W, H);
    expect(note).toEqual(original);
  });
});

describe('clampNotes — batch clamping', () => {
  const W = 400;
  const H = 300;

  test('clamps all notes in the array in place', () => {
    const notes = [
      { top: 10, left: 20, width: 50, height: 50, text: 'inside', id: '1' },
      { top: 500, left: 600, width: 50, height: 50, text: 'outside', id: '2' },
    ];
    clampNotes(notes, W, H);

    expect(notes[0]).toMatchObject({ top: 10, left: 20, width: 50, height: 50 });
    expect(notes[1]).toMatchObject({ top: 250, left: 350, width: 50, height: 50 });
  });

  test('preserves non-geometry properties on notes', () => {
    const notes = [{ top: 500, left: 600, width: 50, height: 50, text: 'hello', id: '99', editable: true }];
    clampNotes(notes, W, H);

    expect(notes[0].text).toBe('hello');
    expect(notes[0].id).toBe('99');
    expect(notes[0].editable).toBe(true);
  });

  test('empty array is a no-op', () => {
    const notes: { top: number; left: number; width: number; height: number }[] = [];
    clampNotes(notes, W, H);
    expect(notes).toEqual([]);
  });
});
