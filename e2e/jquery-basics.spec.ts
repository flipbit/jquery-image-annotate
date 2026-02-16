import { test, expect } from '@playwright/test';

test.describe('jQuery Basics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/jquery-basics.html');
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached' });
  });

  test('editable image initializes with canvas', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('editable image renders 4 annotations', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('editable image has Add Note button', async ({ page }) => {
    // Button is a child of the canvas
    const addButton = page.locator('.image-annotate-canvas').first().locator('.image-annotate-add');
    await expect(addButton).toBeVisible();
  });

  test('hover shows tooltip text', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    // Areas are prepended, tooltips appended — last area = first tooltip
    const lastArea = canvas.locator('.image-annotate-area').last();
    const firstNote = canvas.locator('.image-annotate-note').first();

    await expect(firstNote).toBeHidden();

    // Hover canvas to reveal overlay, then hover area for tooltip
    await canvas.hover();
    await lastArea.hover();

    await expect(firstNote).toBeVisible();
  });

  test('read-only image initializes with canvas', async ({ page }) => {
    const readonlyCanvas = page.locator('.image-annotate-canvas').nth(1);
    await expect(readonlyCanvas).toBeVisible();
  });

  test('read-only image renders 4 annotations', async ({ page }) => {
    const readonlyCanvas = page.locator('.image-annotate-canvas').nth(1);
    const areas = readonlyCanvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('read-only image has no Add Note button', async ({ page }) => {
    // Button is a child of the canvas
    const addButton = page.locator('.image-annotate-canvas').nth(1).locator('.image-annotate-add');
    await expect(addButton).toHaveCount(0);
  });
});
