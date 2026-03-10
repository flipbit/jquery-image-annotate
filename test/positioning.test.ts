import { describe, test, expect } from 'vitest';
import { computeNoteLeft } from '../src/positioning';

describe('computeNoteLeft', () => {
  test('centers note under area when space allows', () => {
    // area is 100px wide at viewport x=200, note is 300px, viewport is 1000px
    // centered left = (100 - 300) / 2 = -100 (relative to area)
    const left = computeNoteLeft(300, 200, 100, 1000);
    expect(left).toBe(-100);
  });

  test('note narrower than area is still centered', () => {
    // area is 300px wide, note is 100px
    // centered left = (300 - 100) / 2 = 100 (relative to area)
    const left = computeNoteLeft(100, 200, 300, 1000);
    expect(left).toBe(100);
  });

  test('clamps right edge when note would overflow viewport', () => {
    // area at viewport x=800, area width=100, note width=300, viewport=1000
    // centered left = (100 - 300) / 2 = -100 → note left in viewport = 800 + (-100) = 700
    // note right = 700 + 300 = 1000 → exactly fits, no clamping
    const left = computeNoteLeft(300, 800, 100, 1000);
    expect(left).toBe(-100);
  });

  test('shifts left when right edge overflows viewport', () => {
    // area at viewport x=850, area width=100, note width=300, viewport=1000
    // centered left = -100 → note left in viewport = 850 + (-100) = 750
    // note right = 750 + 300 = 1050 → overflows by 50
    // adjusted left = -100 - 50 = -150
    const left = computeNoteLeft(300, 850, 100, 1000);
    expect(left).toBe(-150);
  });

  test('shifts right when left edge overflows viewport', () => {
    // area at viewport x=50, area width=100, note width=300, viewport=1000
    // centered left = -100 → note left in viewport = 50 + (-100) = -50
    // overflows left by 50
    // adjusted left = -100 + 50 = -50
    const left = computeNoteLeft(300, 50, 100, 1000);
    expect(left).toBe(-50);
  });

  test('left clamp takes priority when note wider than viewport', () => {
    // area at viewport x=100, area width=50, note width=500, viewport=400
    // centered left = (50 - 500) / 2 = -225 → note left in viewport = 100 + (-225) = -125
    // Right clamp: note right = -125 + 500 = 375 (within 400), no right shift
    // Left clamp: note left = -125 → overflows left by 125
    // adjusted left = -225 + 125 = -100 → note starts at viewport x=0
    // Left clamp runs last and takes priority, ensuring the left edge is visible
    const left = computeNoteLeft(500, 100, 50, 400);
    expect(left).toBe(-100);
  });

  test('area at viewport x=0 with centered note stays at 0', () => {
    // area at viewport x=0, area width=100, note width=100, viewport=1000
    // centered left = 0
    const left = computeNoteLeft(100, 0, 100, 1000);
    expect(left).toBe(0);
  });
});
