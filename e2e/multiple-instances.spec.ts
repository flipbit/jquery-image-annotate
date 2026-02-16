import { test, expect } from '@playwright/test';

test.describe('Multiple Instances', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/multiple-instances.html');
    // Wait for all three canvases to initialize
    const canvases = page.locator('.image-annotate-canvas');
    await expect(canvases).toHaveCount(3);
  });

  test('all three images initialize with canvases', async ({ page }) => {
    const canvases = page.locator('.image-annotate-canvas');
    await expect(canvases).toHaveCount(3);
  });

  test('editable image has 2 annotations', async ({ page }) => {
    const editableCanvas = page.locator('.image-annotate-canvas').first();
    const areas = editableCanvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(2);
  });

  test('read-only image has 2 annotations', async ({ page }) => {
    const readonlyCanvas = page.locator('.image-annotate-canvas').nth(1);
    const areas = readonlyCanvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(2);
  });

  test('empty image has 0 annotations', async ({ page }) => {
    const emptyCanvas = page.locator('.image-annotate-canvas').nth(2);
    const areas = emptyCanvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(0);
  });

  test('editable images have Add Note button', async ({ page }) => {
    const editableAdd = page.locator('.image-annotate-canvas').first().locator('.image-annotate-add');
    await expect(editableAdd).toBeVisible();

    const emptyAdd = page.locator('.image-annotate-canvas').nth(2).locator('.image-annotate-add');
    await expect(emptyAdd).toBeVisible();
  });

  test('read-only image has no Add Note button', async ({ page }) => {
    const readonlyAdd = page.locator('.image-annotate-canvas').nth(1).locator('.image-annotate-add');
    await expect(readonlyAdd).toHaveCount(0);
  });
});
