import { test, expect } from '@playwright/test';

test.describe('Vanilla Basics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/vanilla-basics.html');
    // Wait for plugin to initialize — canvas appears around the image
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
    // The button is a child of the canvas
    const addButton = page.locator('.image-annotate-canvas').first().locator('.image-annotate-add');
    await expect(addButton).toBeVisible();
  });

  test('hover shows tooltip text', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas').first();
    // Areas are prepended (insertBefore firstChild) while tooltips are
    // appended, so the last area in DOM corresponds to the first tooltip.
    const lastArea = canvas.locator('.image-annotate-area').last();
    const firstNote = canvas.locator('.image-annotate-note').first();

    // Tooltip should be hidden before hover
    await expect(firstNote).toBeHidden();

    // Hover over the canvas to reveal the view overlay,
    // then hover over the annotation area to trigger the tooltip
    await canvas.hover();
    await lastArea.hover();

    // Tooltip should now be visible
    await expect(firstNote).toBeVisible();
  });

  test('read-only image initializes with canvas', async ({ page }) => {
    const canvases = page.locator('.image-annotate-canvas');
    const readonlyCanvas = canvases.nth(1);
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
