import { expect, test } from '@playwright/test';

test('Lumi fait découvrir Saturne, aide et reprend sans modifier la progression classique', async ({ page }) => {
    await page.goto('/');
    const classic = await page.evaluate(() => localStorage.getItem('petit-astronome.v1'));
    await page.getByRole('button', { name: /Découvrir avec Lumi/ }).click();
    await page.getByRole('button', { name: 'Les anneaux de Saturne' }).click();
    await page.getByRole('button', { name: 'Essayer' }).click();
    await page.getByRole('button', { name: 'Mars' }).click();
    await page.getByRole('button', { name: 'Mars' }).click();
    await expect(page.getByText('Regarde le modèle, puis essaie.')).toBeVisible();
    await page.getByRole('button', { name: 'Saturne' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.reload();
    await page.getByRole('button', { name: /Découvrir avec Lumi/ }).click();
    await page.getByRole('button', { name: /Les anneaux de Saturne/ }).click();
    await page.getByRole('button', { name: 'Reprendre' }).click();
    await expect(page.getByRole('button', { name: 'Jupiter' })).toBeVisible();
    await page.getByRole('button', { name: 'Passer' }).click();
    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page.getByText('1 geste réalisé sur 3.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('petit-astronome.v1'))).toBe(classic);
});

test('les huit photos sont accessibles depuis l’accueil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Photos des planètes/ }).click();
    await expect(page.locator('.discovery-grid button')).toHaveCount(8);
    await page.getByRole('button', { name: 'Mercure' }).click();
    await expect(page.getByRole('button', { name: 'Précédente' })).toBeDisabled();
    await expect(page.locator('.discovery-photo')).toHaveJSProperty('complete', true);
    await page.getByRole('button', { name: 'Suivante' }).click();
    await expect(page.getByRole('heading', { name: 'Vénus' })).toBeVisible();
});
