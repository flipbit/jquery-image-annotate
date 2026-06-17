import { test, expect } from '@playwright/test';

test.describe('Scaling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/scaling.html');
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached' });
  });

  test('CSS-constrained image: canvas is narrower than natural image width', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(500);
    expect(box!.width).toBeGreaterThan(0);
  });

  test('CSS-constrained image: renders 4 annotations', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('CSS-constrained image: annotations are within canvas bounds', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    const canvasBox = await canvas.boundingBox();
    const areas = canvas.locator('.image-annotate-area');
    const count = await areas.count();

    for (let i = 0; i < count; i++) {
      const areaBox = await areas.nth(i).boundingBox();
      if (areaBox && canvasBox) {
        expect(areaBox.x).toBeGreaterThanOrEqual(canvasBox.x - 1);
        expect(areaBox.y).toBeGreaterThanOrEqual(canvasBox.y - 1);
        expect(areaBox.x + areaBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 2);
        expect(areaBox.y + areaBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + 2);
      }
    }
  });

  test('explicit-size image: canvas matches explicit dimensions', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').nth(1);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(400, 0);
  });

  test('responsive image: renders 4 annotations', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').nth(2);
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('responsive image: canvas resizes with viewport', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').nth(2);
    const initialBox = await canvas.boundingBox();

    // Shrink viewport below the 700px media-query breakpoint so
    // .demo-content max-width drops from 1100px to 900px, which
    // changes the effective width of the 50% responsive container.
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(300);

    const newBox = await canvas.boundingBox();
    expect(newBox).not.toBeNull();
    if (initialBox && newBox) {
      expect(newBox.width).toBeLessThan(initialBox.width);
    }
  });
});
