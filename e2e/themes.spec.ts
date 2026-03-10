import { test, expect } from '@playwright/test';

test.describe('Themes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/themes.html');
    const canvases = page.locator('.image-annotate-canvas');
    await expect(canvases).toHaveCount(3);
  });

  test('all three instances initialize with canvases', async ({ page }) => {
    const canvases = page.locator('.image-annotate-canvas');
    await expect(canvases).toHaveCount(3);
  });

  test('default instance has no data-theme attribute', async ({ page }) => {
    const defaultCanvas = page.locator('.image-annotate-canvas').first();
    await expect(defaultCanvas).not.toHaveAttribute('data-theme');
  });

  test('dark instance has data-theme="dark"', async ({ page }) => {
    const darkCanvas = page.locator('.image-annotate-canvas').nth(1);
    await expect(darkCanvas).toHaveAttribute('data-theme', 'dark');
  });

  test('minimal instance has data-theme="minimal"', async ({ page }) => {
    const minimalCanvas = page.locator('.image-annotate-canvas').nth(2);
    await expect(minimalCanvas).toHaveAttribute('data-theme', 'minimal');
  });

  test('each instance renders annotations', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      const canvas = page.locator('.image-annotate-canvas').nth(i);
      const areas = canvas.locator('.image-annotate-area');
      await expect(areas).toHaveCount(3);
    }
  });

  test('dark theme applies different note background than default', async ({ page }) => {
    // Hover to show tooltips
    const defaultCanvas = page.locator('.image-annotate-canvas').first();
    const darkCanvas = page.locator('.image-annotate-canvas').nth(1);

    await defaultCanvas.hover();
    const defaultArea = defaultCanvas.locator('.image-annotate-area').first();
    await defaultArea.hover();
    const defaultNote = defaultArea.locator('.image-annotate-note');
    await expect(defaultNote).toBeVisible();
    const defaultNoteBg = await defaultNote.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await darkCanvas.hover();
    const darkArea = darkCanvas.locator('.image-annotate-area').first();
    await darkArea.hover();
    const darkNote = darkArea.locator('.image-annotate-note');
    await expect(darkNote).toBeVisible();
    const darkNoteBg = await darkNote.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    expect(defaultNoteBg).not.toBe(darkNoteBg);
  });

  test('minimal theme applies different note background than default', async ({ page }) => {
    const defaultCanvas = page.locator('.image-annotate-canvas').first();
    const minimalCanvas = page.locator('.image-annotate-canvas').nth(2);

    await defaultCanvas.hover();
    const defaultArea = defaultCanvas.locator('.image-annotate-area').first();
    await defaultArea.hover();
    const defaultNote = defaultArea.locator('.image-annotate-note');
    await expect(defaultNote).toBeVisible();
    const defaultNoteBg = await defaultNote.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await minimalCanvas.hover();
    const minimalArea = minimalCanvas.locator('.image-annotate-area').first();
    await minimalArea.hover();
    const minimalNote = minimalArea.locator('.image-annotate-note');
    await expect(minimalNote).toBeVisible();
    const minimalNoteBg = await minimalNote.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    expect(defaultNoteBg).not.toBe(minimalNoteBg);
  });

  test('code blocks are present and visible', async ({ page }) => {
    const codeBlocks = page.locator('.demo-code');
    await expect(codeBlocks).toHaveCount(2);
    await expect(codeBlocks.first()).toBeVisible();
    await expect(codeBlocks.nth(1)).toBeVisible();
  });

  test('code blocks contain theme CSS', async ({ page }) => {
    const darkCode = page.locator('.demo-code').first();
    await expect(darkCode).toContainText('data-theme="dark"');

    const minimalCode = page.locator('.demo-code').nth(1);
    await expect(minimalCode).toContainText('data-theme="minimal"');
  });
});
