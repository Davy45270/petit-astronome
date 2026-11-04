import { describe, expect, it } from 'vitest';
import { sizesSvg, artSvg, sceneSvg, lineupRadius, moonBody, drawBoardSvg } from '../src/ui/art';
import { planet, planetIds } from '../src/engine/planets';
import { phaseIds } from '../src/engine/moon';
import { constellations } from '../src/engine/sky';
import { levels } from '../src/engine/levels';
import { makeRng } from '../src/engine/rng';
import { spotTargets } from '../src/engine/questions';

const balanced = (svg: string): boolean => (svg.match(/<svg\b/g) ?? []).length === (svg.match(/<\/svg>/g) ?? []).length && !/undefined|NaN/.test(svg);

describe('drawings', () => {
    it('draws planets at TRUE relative scale when comparing sizes', () => {
        const svg = sizesSvg(['terre', 'jupiter', 'mars'], true);
        const r: Record<string, number> = Object.fromEntries([...svg.matchAll(/data-planet="(\w+)" data-r="([\d.]+)"/g)].map(m => [m[1]!, Number(m[2])]));
        expect(r.jupiter! / r.terre!).toBeCloseTo(planet('jupiter').radiusKm / planet('terre').radiusKm, 1);
        expect(r.mars! / r.terre!).toBeCloseTo(planet('mars').radiusKm / planet('terre').radiusKm, 1);
    });
    it('keeps the order of sizes in the solar system line-up', () => {
        const byLineup = [...planetIds].sort((a, b) => lineupRadius(a) - lineupRadius(b));
        const byTruth = [...planetIds].sort((a, b) => planet(a).radiusKm - planet(b).radiusKm);
        expect(byLineup).toEqual(byTruth);
    });
    it('renders every drawing used by the levels without holes', () => {
        for (const info of levels) {
            expect(balanced(artSvg(info.notion.art))).toBe(true);
            for (const entry of info.bank) {
                const q = entry.make(makeRng(3));
                if (q.art) expect(balanced(artSvg(q.art)), q.key).toBe(true);
                if (q.type === 'choice') for (const c of q.choices) if (c.art) expect(balanced(artSvg(c.art)), q.key).toBe(true);
                if (q.type === 'spot') {
                    const svg = sceneSvg(q.scene);
                    expect(balanced(svg), q.key).toBe(true);
                    for (const id of spotTargets(q.scene)) expect(svg, `${q.key} ${id}`).toContain(`data-spot="${id}"`);
                }
            }
        }
        for (const id of phaseIds) expect(balanced(`<svg>${moonBody(id, 40)}</svg>`)).toBe(true);
        for (const c of constellations) expect(balanced(drawBoardSvg(c.id, true))).toBe(true);
    });
    it('a new Moon shows no lit part and a full Moon a whole disc', () => {
        expect(moonBody('nouvelle', 40)).toContain('<rect width="0" height="0"/>');
        expect(moonBody('pleine', 40)).toMatch(/<clipPath id="\w+l"><circle r="40"\/>/);
    });
});
