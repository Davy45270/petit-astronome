import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../src/engine/levels';
import { planet, rank } from '../src/engine/planets';
import { phase, waxing } from '../src/engine/moon';
import { constellation } from '../src/engine/sky';
import { makeRng } from '../src/engine/rng';
import { spotTargets, type Question } from '../src/engine/questions';
import { SESSION_LENGTH } from '../src/engine/progress';

const all = (): { level: number; q: Question }[] => levels.flatMap((info, i) => info.bank.flatMap(entry => [1, 2, 3, 4, 5].map(seed => ({ level: i + 1, q: entry.make(makeRng(seed * 977 + i)) }))));

describe('catalogue', () => {
    it('offers at least 30 levels in at least six lessons', () => {
        expect(levels.length).toBeGreaterThanOrEqual(30);
        expect(lessons.length).toBeGreaterThanOrEqual(6);
        for (const lesson of lessons) expect(lesson.levels.length).toBeGreaterThanOrEqual(4);
    });
    it('every level has a notion card and enough distinct questions for a session', () => {
        levels.forEach((info, i) => {
            expect(info.notion.lines.length, `level ${i + 1}`).toBeGreaterThan(0);
            expect(info.bank.length, `level ${i + 1}`).toBeGreaterThanOrEqual(SESSION_LENGTH);
            const keys = info.bank.map(e => e.key);
            expect(new Set(keys).size, `level ${i + 1}`).toBe(keys.length);
            for (const key of keys) expect(key).toMatch(/^[a-z0-9-]{1,40}$/);
        });
    });
    it('every question is answerable', () => {
        for (const { level, q } of all()) {
            const where = `level ${level} ${q.key}`;
            expect(q.prompt.length, where).toBeGreaterThan(5);
            expect(q.explain.length, where).toBeGreaterThan(5);
            if (q.type === 'choice') {
                expect(q.choices.length, where).toBeGreaterThanOrEqual(2);
                expect(q.choices.length, where).toBeLessThanOrEqual(4);
                expect(new Set(q.choices.map(c => c.id)).size, where).toBe(q.choices.length);
                expect(new Set(q.choices.map(c => c.label)).size, where).toBe(q.choices.length);
                expect(q.choices.filter(c => c.id === q.answer), where).toHaveLength(1);
            }
            if (q.type === 'spot') expect(spotTargets(q.scene), where).toContain(q.answer);
            if (q.type === 'order') {
                expect([...q.items.map(c => c.id)].sort(), where).toEqual([...q.answer].sort());
                expect(q.items.map(c => c.id), where).not.toEqual(q.answer);
            }
            if (q.type === 'draw') expect(constellation(q.constellation).lines.length, where).toBeGreaterThan(2);
        }
    });
});

describe('the answers agree with the science data', () => {
    const qs = all().map(x => x.q);
    it('neighbour questions follow the real order', () => {
        for (const q of qs) if (q.type === 'choice' && /^(apres|avant)-/.test(q.key)) {
            const [dir, id] = q.key.split('-') as [string, never];
            expect(rank(q.answer as never) - rank(id), q.key).toBe(dir === 'apres' ? 1 : -1);
        }
    });
    it('the bigger planet is really bigger, the farther one really farther', () => {
        for (const q of qs) {
            if (q.type === 'spot' && q.key.startsWith('gros-')) {
                const other = q.scene.t === 'sizes' ? q.scene.ids.find(id => id !== q.answer)! : q.answer;
                expect(planet(q.answer as never).radiusKm, q.key).toBeGreaterThan(planet(other as never).radiusKm * 1.3);
            }
            if (q.type === 'choice' && q.key.startsWith('loin-')) {
                const other = q.choices.find(c => c.id !== q.answer)!.id;
                expect(planet(q.answer as never).distanceAu, q.key).toBeGreaterThan(planet(other as never).distanceAu);
            }
        }
    });
    it('sorting by size and by distance matches the data', () => {
        for (const q of qs) if (q.type === 'order' && q.key.startsWith('taille-')) {
            const r = q.answer.map(id => planet(id as never).radiusKm);
            expect([...r].sort((a, b) => a - b), q.key).toEqual(r);
        }
        for (const q of qs) if (q.type === 'order' && /^(ordre|grand)-/.test(q.key)) {
            const ranks = q.answer.map(id => rank(id as never));
            const sorted = [...ranks].sort((a, b) => a - b);
            expect(ranks, q.key).toEqual(q.key.includes('inverse') ? sorted.reverse() : sorted);
        }
    });
    it('a growing Moon is answered “grandit”, a shrinking one “diminue”', () => {
        for (const q of qs) if (q.type === 'choice' && q.key.startsWith('grandit-')) {
            const id = q.key.replace('grandit-', '');
            expect(q.answer, q.key).toBe(waxing(phase(id as never).age) ? 'grandit' : 'diminue');
        }
    });
    it('the hotter star is the bluer one', () => {
        const heat = ['rouge', 'orange', 'jaune', 'blanche', 'bleue'];
        for (const q of qs) if (q.type === 'spot' && q.scene.t === 'stars') {
            const i = Number(q.answer.replace('etoile-', ''));
            const colors = q.scene.colors;
            expect(heat.indexOf(colors[i]!), q.key).toBeGreaterThan(heat.indexOf(colors[1 - i]!));
        }
    });
});
