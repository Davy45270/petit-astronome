import type { CDPSession } from '@playwright/test';
import { test, expect, state, openAll, starAt, spotAt } from './helpers';
import { constellation } from '../../src/engine/sky';
import { makeRng } from '../../src/engine/rng';

/**
 * A child’s finger: real touch events (CDP), landing a few pixels off, wobbling on the way, sometimes
 * lingering. Each level must end at 6/6 without a single mistake and without the page scrolling.
 */
type Touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x?: number, y?: number) => Promise<void>;
const finger = (cdp: CDPSession): Touch => async (type, x = 0, y = 0) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
};

for (const [level, label] of [[36, 'drawing seven constellations from memory'], [33, 'Orion with its guide'], [15, 'sorting the planets'], [29, 'finding the Pole Star'], [4, 'the solar system'], [26, 'the Moon around the Earth'], [8, 'recognising planets']] as const) {
    test(`noisy finger session: level ${level}, ${label}`, async ({ page, context }) => {
        await openAll(page);
        // Every pointer and click the page receives, to explain a lost touch if one happens.
        await page.addInitScript(() => {
            const log: string[] = [];
            Object.defineProperty(window, '__probe', { value: log });
            for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'lostpointercapture']) document.addEventListener(type, event => {
                const el = event.target as Element;
                const p = event as PointerEvent;
                log.push(`${Math.round(performance.now())} ${type} ${String(p.pointerId)} ${el.tagName}${el.id ? '#' + el.id : ''}.${(el.getAttribute('class') ?? '').slice(0, 20)} ${Math.round(p.clientX)},${Math.round(p.clientY)} connected=${el.isConnected}`);
                if (log.length > 60) log.shift();
            }, true);
        });
        await page.goto('/');
        const probe = async (): Promise<string> => (await page.evaluate(() => (window as unknown as { __probe: string[] }).__probe)).join('\n');
        const cdp = await context.newCDPSession(page);
        const touch = finger(cdp);
        const rng = makeRng(level * 17);
        const noise = (n: number): number => (rng() * 2 - 1) * n;
        const tap = async (x: number, y: number, jitter = 5): Promise<void> => {
            const tx = x + noise(jitter), ty = y + noise(jitter);
            await touch('touchStart', tx, ty);
            await page.waitForTimeout(40 + Math.floor(rng() * 90));
            await touch('touchEnd');
        };
        const tapEl = async (selector: string): Promise<void> => {
            // Like a child on a phone: swipe the page up until the button is on screen, then tap it.
            const viewport = page.viewportSize()!;
            for (let swipe = 0; swipe < 12; swipe++) {
                const b = (await page.locator(selector).boundingBox())!;
                if (b.y >= 60 && b.y + b.height <= viewport.height - 60) break;
                const up = b.y > viewport.height / 2;
                const x = viewport.width * (0.3 + rng() * 0.4), y0 = viewport.height * (up ? 0.78 : 0.3), y1 = viewport.height * (up ? 0.3 : 0.78);
                await touch('touchStart', x, y0);
                for (let s = 1; s <= 10; s++) {
                    await touch('touchMove', x + noise(4), y0 + (y1 - y0) * s / 10);
                    await page.waitForTimeout(16);
                }
                await touch('touchEnd');
                // Let any fling settle before the next look.
                let last = -1;
                for (let i = 0; i < 40; i++) {
                    const y = await page.evaluate(() => scrollY);
                    if (y === last) break;
                    last = y;
                    await page.waitForTimeout(100);
                }
            }
            const box = (await page.locator(selector).boundingBox())!;
            expect(box.y + box.height, `${selector} reached by swiping`).toBeLessThanOrEqual(page.viewportSize()!.height);
            expect(box.y, `${selector} reached by swiping`).toBeGreaterThanOrEqual(0);
            await tap(box.x + box.width / 2, box.y + box.height / 2, Math.min(box.width, box.height) / 4);
        };
        await tapEl(`[data-level="${level}"]`);
        await expect(page.locator('.notion')).toBeVisible();
        await tapEl('#start');
        const scroll = await page.evaluate(() => scrollY);
        for (let i = 0; i < 6; i++) {
            const q = (await state(page)).question!;
            if (q.type === 'choice') await tapEl(`[data-answer="${q.answer}"]`);
            if (q.type === 'spot') { const p = await spotAt(page, q.answer); await tap(p.x, p.y, 3); }
            if (q.type === 'order') for (const id of q.answer) await tapEl(`[data-item="${id}"]`);
            if (q.type === 'draw') for (const [a, b] of constellation(q.constellation).lines) {
                const p = await starAt(page, a), r = await starAt(page, b);
                await touch('touchStart', p.x + noise(3), p.y + noise(3));
                const steps = 8 + Math.floor(rng() * 8);
                for (let s = 1; s <= steps; s++) {
                    const k = s / steps, wobble = s === steps ? 2.5 : 6;
                    await touch('touchMove', p.x + (r.x - p.x) * k + noise(wobble), p.y + (r.y - p.y) * k + noise(wobble));
                    await page.waitForTimeout(2 + Math.floor(rng() * 10));
                }
                await touch('touchEnd');
            }
            try {
                await expect(page.locator('#continue')).toBeVisible();
            } catch {
                throw new Error(`${q.key} not solved by the finger:\n${await probe()}`);
            }
            expect((await state(page)).mistakes, q.key).toBe(0);
            expect(await page.evaluate(() => scrollY)).toBe(scroll);
            await tapEl('#continue');
            try {
                await expect.poll(async () => (await state(page)).screen === 'result' || (await state(page)).index === i + 1).toBe(true);
            } catch {
                throw new Error(`tap on Continuer after ${q.key} lost:\n${await probe()}`);
            }
        }
        await expect(page.locator('.result .score')).toHaveText('6/6');
        await expect(page.locator('.result .stars')).toHaveAttribute('aria-label', '3 étoiles');
    });
}

test('a second finger cannot hijack a stroke', async ({ page, context }) => {
    await openAll(page);
    await page.goto('/');
    await page.locator('[data-level="36"]').click();
    await page.locator('#start').click();
    const q = (await state(page)).question!;
    if (q.type !== 'draw') throw new Error('draw level');
    const [a, b] = constellation(q.constellation).lines[0]!;
    const p = await starAt(page, a), r = await starAt(page, b);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: p.x, y: p.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: (p.x + r.x) / 2, y: (p.y + r.y) / 2 }] });
    // A second finger lands on the target star and lifts: nothing must be linked by it.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: (p.x + r.x) / 2, y: (p.y + r.y) / 2 }, { id: 2, x: r.x, y: r.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id: 2, x: r.x, y: r.y }] });
    expect((await state(page)).drawn).toEqual([]);
    expect((await state(page)).mistakes).toBe(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: r.x, y: r.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await state(page)).drawn.length).toBe(1);
    expect((await state(page)).mistakes).toBe(0);
});
