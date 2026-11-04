import { test, expect, state, openAll, startLevel, solve, playPerfect, starAt } from './helpers';
import { lineKey, constellation } from '../../src/engine/sky';

test('home lists every level; only the first is open on a new device', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Petit Astronome');
    await expect(page.locator('[data-level]')).toHaveCount(37);
    await expect(page.locator('[data-level="1"]')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[data-level="2"]')).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled: Playwright would wait for it to be enabled, a child just taps it.
    await page.locator('[data-level="2"]').click({ force: true });
    await expect(page.locator('[data-level="2"]')).toHaveClass(/shake/);
    await expect(page.locator('.notion')).toHaveCount(0);
});

test('a perfect first level earns three stars and opens the next level', async ({ page }) => {
    await page.goto('/');
    await startLevel(page, 1);
    await playPerfect(page);
    await expect(page.locator('.result .stars')).toHaveAttribute('aria-label', '3 étoiles');
    await page.locator('#next').click();
    await expect(page.locator('.notion h1')).toHaveText('La Terre tourne sur elle-même');
    await page.locator('#home').click();
    await expect(page.locator('[data-level="1"] .stars')).toHaveAttribute('aria-label', '3 étoiles');
    await expect(page.locator('[data-level="2"]')).not.toHaveAttribute('aria-disabled', 'true');
    await page.reload();
    await expect(page.locator('[data-level="2"]')).not.toHaveAttribute('aria-disabled', 'true');
});

test('a mistake shows the notion, comes back next session and appears for parents', async ({ page }) => {
    await page.goto('/');
    await startLevel(page, 1);
    const first = (await state(page)).question!;
    if (first.type !== 'choice') throw new Error('level 1 asks choices');
    const wrong = first.choices.find(c => c.id !== first.answer)!.id;
    await page.locator(`[data-answer="${wrong}"]`).click();
    await expect(page.locator(`[data-answer="${wrong}"]`)).toHaveClass(/wrong/);
    await expect(page.locator('#message')).toContainText('Essaie encore');
    await page.waitForTimeout(1100);
    await page.locator(`[data-answer="${first.answer}"]`).click();
    await expect(page.locator('#message')).toContainText(first.explain.slice(0, 20));
    await page.locator('#continue').click();
    for (let i = 1; i < 6; i++) { await solve(page); await page.locator('#continue').click(); }
    await expect(page.locator('.result .score')).toHaveText('5/6');
    expect((await state(page)).outcomes).toEqual(['retry', 'sure', 'sure', 'sure', 'sure', 'sure']);
    await page.locator('#again').click();
    await page.locator('#start').click();
    const again = await state(page);
    expect(again.question!.key).toBe(first.key);
    await expect(page.locator('.again')).toHaveText('À revoir');
    await page.locator('#home').click();
    await page.locator('#parents').click();
    const gate = page.locator('#gate b');
    const product = Number(await gate.getAttribute('data-a')) * Number(await gate.getAttribute('data-b'));
    await page.locator('#gate-answer').fill(String(product - 1));
    await page.locator('#gate-enter').click();
    await expect(page.locator('#gate-message')).toHaveText('Ce n’est pas la bonne réponse.');
    await page.locator('#gate-answer').fill(String(product));
    await page.locator('#gate-enter').click();
    const row = page.locator('.follow[data-level="1"]');
    await expect(row).toHaveAttribute('data-state', 'learning');
    await expect(row).toContainText('Du premier coup : 5/6');
    await expect(row).toContainText('À revoir : 1');
    await expect(page.locator('.privacy')).toContainText('rien n’est envoyé');
    await page.locator('#erase').click();
    await page.locator('#erase').click();
    await expect(page.locator('.follow[data-level="1"]')).toHaveAttribute('data-state', 'new');
});

test('rapid random taps do not validate a session', async ({ page }) => {
    await page.goto('/');
    await startLevel(page, 1);
    for (let i = 0; i < 6; i++) {
        const q = (await state(page)).question!;
        if (q.type === 'choice') {
            for (const c of q.choices) if (c.id !== q.answer) await page.locator(`[data-answer="${c.id}"]`).click();
            await page.locator(`[data-answer="${q.answer}"]`).click();
        } else await solve(page);
        await page.locator('#continue').click();
    }
    await expect(page.locator('.result h1')).toHaveText('Série à refaire');
    await page.locator('#home').click();
    await expect(page.locator('[data-level="2"]')).toHaveAttribute('aria-disabled', 'true');
});

for (const [level, name] of [[4, 'scene to tap'], [15, 'planets to sort'], [36, 'constellations to draw'], [26, 'moon orbit'], [16, 'true-scale sizes']] as const) {
    test(`plays a level with ${name}`, async ({ page }) => {
        await openAll(page);
        await page.goto('/');
        await startLevel(page, level);
        await playPerfect(page);
        await expect(page.locator('.result .stars')).toHaveAttribute('aria-label', '3 étoiles');
    });
}

test('a wrong stroke is a mistake; three of them bring the guide lines back', async ({ page }) => {
    await openAll(page);
    await page.goto('/');
    await startLevel(page, 36);
    const q = (await state(page)).question!;
    if (q.type !== 'draw') throw new Error('draw level');
    await expect(page.locator('#guide line')).toHaveCount(0);
    const ids = (await page.locator('.sky-star').evaluateAll(els => els.map(e => (e as SVGElement).dataset.star!)));
    // Tap mode: a star, then a star it is not linked to.
    const lines = new Set(constellation(q.constellation).lines.map(([a, b]) => lineKey(a, b)));
    const pair = ids.flatMap(a => ids.map(b => [a, b] as const)).find(([a, b]) => a !== b && !lines.has(lineKey(a, b)))!;
    for (let i = 0; i < 3; i++) {
        for (const id of pair) {
            const p = await starAt(page, id);
            await page.mouse.click(p.x, p.y);
        }
        await page.waitForTimeout(1100);
    }
    expect((await state(page)).mistakes).toBe(3);
    await expect(page.locator('#guide line')).toHaveCount(lines.size);
});
