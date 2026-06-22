import { test, expect } from '@playwright/test';

test.describe('Programmatic API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/programmatic-api.html');
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached' });
  });

  test('plugin initializes with 3 annotations', async ({ page }) => {
    const areas = page.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
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
    await expect(areas).toHaveCount(4);
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
    await expect(areas).toHaveCount(4);
  });

  test('Clear All removes manually added annotation', async ({ page }) => {
    // Click "Add Note" button in the plugin controls
    await page.click('#btn-add');

    // Draw a rectangle on the image by dragging on the edit overlay
    const editArea = page.locator('.image-annotate-edit-area');
    await expect(editArea).toBeVisible();

    // Type text and save
    const textarea = page.locator('.image-annotate-edit-form textarea');
    await textarea.fill('Manual test note');
    await page.click('.image-annotate-edit-ok');

    // Should now have 5 annotations (4 initial + 1 manual)
    await expect(page.locator('.image-annotate-area')).toHaveCount(5);

    // Clear all
    await page.click('#btn-clear');

    // ALL annotations should be gone, including the manually added one
    await expect(page.locator('.image-annotate-area')).toHaveCount(0);
  });

  test('Reload Notes after manual add does not leave orphaned views', async ({ page }) => {
    // Add a manual note
    await page.click('#btn-add');
    const textarea = page.locator('.image-annotate-edit-form textarea');
    await textarea.fill('Will be orphaned');
    await page.click('.image-annotate-edit-ok');

    await expect(page.locator('.image-annotate-area')).toHaveCount(5);

    // Reload notes — should replace all views with just the 4 initial ones
    await page.click('#btn-reload');
    await expect(page.locator('.image-annotate-area')).toHaveCount(4);
  });

  test('Export after manual add includes the manually added note', async ({ page }) => {
    // Add a manual note
    await page.click('#btn-add');
    const textarea = page.locator('.image-annotate-edit-form textarea');
    await textarea.fill('Exported note');
    await page.click('.image-annotate-edit-ok');

    // Export
    await page.click('#btn-export');
    const exportText = await page.locator('#export-target').textContent();
    const notes = JSON.parse(exportText!);

    expect(notes).toHaveLength(5);
    expect(notes.some((n: { text: string }) => n.text === 'Exported note')).toBe(true);
  });

  test('status log records operations', async ({ page }) => {
    const status = page.locator('#api-status');
    await expect(status).toContainText('initialized');
  });
});
