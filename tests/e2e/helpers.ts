import { test as base, expect, type Page } from '@playwright/test';
import type { Question } from '../../src/engine/questions';
import { constellation } from '../../src/engine/sky';

export interface State {
    screen: string;
    level: number;
    index: number;
    score: number;
    solved: boolean;
    outcomes: string[];
    validated: boolean;
    question: Question | null;
    placed: string[];
    drawn: string[];
    mistakes: number
}
interface Point { x: number; y: number }
type Hook = { state: () => State; star: (id: string) => Point | null; spot: (id: string) => Point | null };

export const state = (page: Page): Promise<State> => page.evaluate(() => (window as unknown as { __astro: Hook }).__astro.state());
export const starAt = (page: Page, id: string): Promise<Point> => page.evaluate(sid => (window as unknown as { __astro: Hook }).__astro.star(sid)!, id);
export const spotAt = (page: Page, id: string): Promise<Point> => page.evaluate(sid => (window as unknown as { __astro: Hook }).__astro.spot(sid)!, id);

export const test = base.extend<{ consoleGuard: boolean }>({
    consoleGuard: [async ({ page }, use) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await use(true);
        expect(errors).toEqual([]);
    }, { auto: true }]
});
export { expect };

/** Every level open, nothing else. */
export async function openAll(page: Page, levels = 37): Promise<void> {
    await page.addInitScript(count => {
        const records: Record<string, number> = {};
        for (let i = 1; i <= count; i++) records[String(i)] = 6;
        localStorage.setItem('petit-astronome.v1', JSON.stringify({ version: 1, records, mastery: {}, reviews: {}, voice: false }));
    }, levels);
}

export async function startLevel(page: Page, level: number): Promise<void> {
    await page.locator(`[data-level="${level}"]`).click();
    await expect(page.locator('.notion')).toBeVisible();
    await page.locator('#start').click();
    await expect(page.locator('#prompt')).toBeVisible();
}

/** Solve the current question with mouse gestures, without mistakes. */
export async function solve(page: Page): Promise<void> {
    const q = (await state(page)).question!;
    if (q.type === 'choice') await page.locator(`[data-answer="${q.answer}"]`).click();
    if (q.type === 'spot') {
        const p = await spotAt(page, q.answer);
        await page.mouse.click(p.x, p.y);
    }
    if (q.type === 'order') for (const id of q.answer) await page.locator(`[data-item="${id}"]`).click();
    if (q.type === 'draw') for (const [a, b] of constellation(q.constellation).lines) {
        const p = await starAt(page, a), r = await starAt(page, b);
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        for (let i = 1; i <= 8; i++) await page.mouse.move(p.x + (r.x - p.x) * i / 8, p.y + (r.y - p.y) * i / 8);
        await page.mouse.up();
    }
    await expect(page.locator('#continue')).toBeVisible();
}

export async function playPerfect(page: Page): Promise<void> {
    for (let i = 0; i < 6; i++) {
        expect((await state(page)).index).toBe(i);
        await solve(page);
        await page.locator('#continue').click();
    }
    await expect(page.locator('.result .score')).toHaveText('6/6');
}
