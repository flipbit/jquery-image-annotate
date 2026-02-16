import { test, expect } from '@playwright/test';

test.describe('Programmatic API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/programmatic-api.html');
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached' });
  });

  test('plugin initializes with 3 annotations', async ({ page }) => {
    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(3);
  });

  test('Clear All removes all annotations', async ({ page }) => {
    await page.click('#btn-clear');
    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(0);
  });

  test('Reload Notes restores annotations after clear', async ({ page }) => {
    await page.click('#btn-clear');
    await expect(page.locator('.image-annotate-area')).toHaveCount(0);

    await page.click('#btn-reload');
    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(3);
  });

  test('Destroy removes the canvas and restores image', async ({ page }) => {
    await page.click('#btn-destroy');

    // Canvas should be gone
    const canvases = page.locator('.image-annotate-canvas');
    await expect(canvases).toHaveCount(0);

    // Original image should be visible again
    const img = page.locator('#api-image');
    await expect(img).toBeVisible();
  });

  test('Reinitialize recreates the plugin after destroy', async ({ page }) => {
    await page.click('#btn-destroy');
    await expect(page.locator('.image-annotate-canvas')).toHaveCount(0);

    await page.click('#btn-reinit');
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached' });

    const canvas = page.locator('.image-annotate-canvas');
    await expect(canvas).toBeVisible();

    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(3);
  });

  test('status log records operations', async ({ page }) => {
    const status = page.locator('#api-status');
    await expect(status).toContainText('initialized');
  });
});
