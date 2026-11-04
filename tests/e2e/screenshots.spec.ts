import type { Page } from '@playwright/test';
import { test, expect, state, starAt, startLevel, solve } from './helpers';
import { constellation } from '../../src/engine/sky';

declare const process: { env: Record<string, string | undefined> };
test.skip(process.env.SCREENSHOTS !== '1', 'Opt-in README screenshots: SCREENSHOTS=1');

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const records: Record<string, number> = {};
        for (let i = 1; i <= 37; i++) records[String(i)] = i < 12 ? 6 : i < 20 ? 5 : 6;
        const mastery: Record<string, unknown> = {
            1: { recent: 'ssssssssssss', sessions: 3, last: '2026-11-02' }, 2: { recent: 'ssrsssssssss', sessions: 2, last: '2026-11-03' },
            4: { recent: 'sssrsgsss', sessions: 2, last: '2026-11-04' }, 21: { recent: 'ssssrs', sessions: 1, last: '2026-11-04' }
        };
        localStorage.setItem('petit-astronome.v1', JSON.stringify({ version: 1, records, mastery, reviews: { 4: ['sys-mercure'] }, voice: false }));
        // Fixed session order for identical screenshots between runs.
        Date.now = () => 1_767_000_000_000;
    });
    await page.goto('/');
});

async function capture(page: Page, name: string): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `docs/screenshots/${name}.png`, animations: 'disabled', caret: 'hide', style: '#listen { visibility: hidden !important; }' });
}

async function until(page: Page, type: string): Promise<void> {
    for (let i = 0; i < 6 && (await state(page)).question!.type !== type; i++) { await solve(page); await page.locator('#continue').click(); }
}

test('home', async ({ page }) => { await capture(page, 'home'); });

test('notion card', async ({ page }) => {
    await page.locator('[data-level="29"]').click();
    await capture(page, 'notion');
});

test('recognise a planet', async ({ page }) => {
    await startLevel(page, 8);
    await capture(page, 'planets');
});

test('sort the planets', async ({ page }) => {
    await startLevel(page, 15);
    await until(page, 'order');
    const q = (await state(page)).question!;
    if (q.type === 'order') for (const id of q.answer.slice(0, 3)) await page.locator(`[data-item="${id}"]`).click();
    await capture(page, 'order');
});

test('draw a constellation', async ({ page }) => {
    await startLevel(page, 33);
    await until(page, 'draw');
    const q = (await state(page)).question!;
    if (q.type === 'draw') for (const [a, b] of constellation(q.constellation).lines.slice(0, 5)) {
        const p = await starAt(page, a), r = await starAt(page, b);
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        for (let i = 1; i <= 6; i++) await page.mouse.move(p.x + (r.x - p.x) * i / 6, p.y + (r.y - p.y) * i / 6);
        await page.mouse.up();
    }
    await capture(page, 'draw');
});

test('moon phases', async ({ page }) => {
    await startLevel(page, 23);
    await capture(page, 'moon');
});

test('true-scale sizes, solved with its explanation', async ({ page }) => {
    await startLevel(page, 16);
    await solve(page);
    await capture(page, 'sizes');
});

test('parents follow-up', async ({ page }) => {
    await page.locator('#parents').click();
    const gate = page.locator('#gate b');
    await page.locator('#gate-answer').fill(String(Number(await gate.getAttribute('data-a')) * Number(await gate.getAttribute('data-b'))));
    await page.locator('#gate-enter').click();
    await expect(page.locator('.parents')).toBeVisible();
    await capture(page, 'parents');
});
