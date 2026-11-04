import { test, expect } from './helpers';

test('a fully installed worker reloads and plays offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Petit Astronome');
    await page.locator('[data-level="1"]').click();
    await page.locator('#start').click();
    await expect(page.locator('#prompt')).toBeVisible();
    await context.setOffline(false);
});
