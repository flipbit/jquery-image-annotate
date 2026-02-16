import { test, expect } from '@playwright/test';

test.describe('Vue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/vue.html');
    // Vue loads from CDN (esm.sh), so allow extra time for initialization
    await page.waitForSelector('.image-annotate-canvas', { state: 'attached', timeout: 15_000 });
  });

  test('renders annotation canvas', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas');
    await expect(canvas).toBeVisible();
  });

  test('renders 4 initial annotations', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas');
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);
  });

  test('has Add Note button', async ({ page }) => {
    const addButton = page.locator('.image-annotate-canvas').locator('.image-annotate-add');
    await expect(addButton).toBeVisible();
  });

  test('can add and save an annotation', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas');
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);

    // Click the Add Note button
    const addButton = page.locator('.image-annotate-add');
    await addButton.click();

    // Edit form should appear
    const editForm = page.locator('.image-annotate-edit-form');
    await expect(editForm).toBeVisible();

    // Type note text
    const textarea = editForm.locator('textarea');
    await textarea.fill('E2E test annotation');

    // Click OK to save
    const okButton = editForm.locator('.image-annotate-edit-ok');
    await okButton.click();

    // Should now have 5 annotations
    await expect(areas).toHaveCount(5);
  });

  test('can delete an editable annotation', async ({ page }) => {
    const canvas = page.locator('.image-annotate-canvas');
    const areas = canvas.locator('.image-annotate-area');
    await expect(areas).toHaveCount(4);

    // The demo has editable areas with class image-annotate-area-editable
    // Click the first editable annotation to open edit mode
    const editableArea = canvas.locator('.image-annotate-area-editable').first();
    await canvas.hover();
    await editableArea.click();

    // Edit form should appear with delete button
    const deleteButton = page.locator('.image-annotate-edit-delete');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Should now have 3 annotations
    await expect(areas).toHaveCount(3);
  });
});
