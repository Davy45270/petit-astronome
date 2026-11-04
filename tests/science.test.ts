import { describe, expect, it } from 'vitest';
import { planets, planetIds, SUN_RADIUS_KM, MOON_RADIUS_KM, MNEMONIC, planet } from '../src/engine/planets';
import { phases, illumination, litFraction, litShape, waxing, SYNODIC_DAYS } from '../src/engine/moon';
import { constellations, constellation, separation, circumpolar, project, layout, centreOf, northStars } from '../src/engine/sky';

const star = (c: string, id: string) => constellation(c as never).stars.find(s => s.id === id)!;

describe('planets', () => {
    it('are listed by increasing distance to the Sun', () => {
        const d = planets.map(p => p.distanceAu);
        expect([...d].sort((a, b) => a - b)).toEqual(d);
        expect(planetIds).toEqual(['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune']);
    });
    it('have the true size ranking', () => {
        const bySize = [...planets].sort((a, b) => a.radiusKm - b.radiusKm).map(p => p.id);
        expect(bySize).toEqual(['mercure', 'mars', 'venus', 'terre', 'neptune', 'uranus', 'saturne', 'jupiter']);
        expect(SUN_RADIUS_KM / planet('terre').radiusKm).toBeCloseTo(109, 0);
        expect(planet('jupiter').radiusKm / planet('terre').radiusKm).toBeCloseTo(11, 0);
        expect(MOON_RADIUS_KM / planet('terre').radiusKm).toBeCloseTo(0.27, 2);
    });
    it('split into four rocky and four giant planets', () => {
        expect(planets.map(p => p.family)).toEqual(['rocheuse', 'rocheuse', 'rocheuse', 'rocheuse', 'géante', 'géante', 'géante', 'géante']);
    });
    it('follow the year length of Kepler’s third law (T² ∝ a³) within 1 %', () => {
        for (const p of planets) expect(Math.abs(p.yearDays / 365.25 - p.distanceAu ** 1.5) / p.distanceAu ** 1.5).toBeLessThan(0.01);
    });
    it('match the initials of the mnemonic', () => {
        expect(MNEMONIC.map(w => w[0])).toEqual(planets.map(p => p.name.replace(/^la /, '')[0]!.toUpperCase()));
    });
});

describe('moon phases', () => {
    it('go from dark to full and back', () => {
        expect(illumination(0)).toBeCloseTo(0);
        expect(illumination(SYNODIC_DAYS / 2)).toBeCloseTo(1);
        expect(illumination(SYNODIC_DAYS / 4)).toBeCloseTo(0.5);
        const lit = phases.map(p => illumination(p.age));
        for (let i = 1; i <= 4; i++) expect(lit[i]!).toBeGreaterThan(lit[i - 1]!);
        for (let i = 5; i < 8; i++) expect(lit[i]!).toBeLessThan(lit[i - 1]!);
    });
    it('draw a lit area equal to the illuminated fraction', () => {
        for (let age = 0; age < SYNODIC_DAYS; age += 0.37) expect(litFraction(age)).toBeCloseTo(illumination(age), 9);
    });
    it('are lit on the right while growing, as seen from France', () => {
        for (const p of phases.slice(1, 4)) expect([waxing(p.age), litShape(p.age).side]).toEqual([true, 'right']);
        for (const p of phases.slice(5)) expect([waxing(p.age), litShape(p.age).side]).toEqual([false, 'left']);
        expect(litShape(phases[1]!.age).bulge).toBe('out');
        expect(litShape(phases[3]!.age).bulge).toBe('in');
    });
});

describe('real sky', () => {
    it('every figure line joins two stars of its constellation', () => {
        for (const c of constellations) for (const [a, b] of c.lines) {
            expect(c.stars.some(s => s.id === a), `${c.id} ${a}`).toBe(true);
            expect(c.stars.some(s => s.id === b), `${c.id} ${b}`).toBe(true);
        }
    });
    it('the two pointer stars lead to the Pole Star about five times their gap away', () => {
        const merak = star('grande-ourse', 'merak'), dubhe = star('grande-ourse', 'dubhe'), polaris = star('petite-ourse', 'polaris');
        const gap = separation(merak, dubhe), reach = separation(dubhe, polaris);
        expect(reach / gap).toBeGreaterThan(4.5);
        expect(reach / gap).toBeLessThan(6);
        // Merak, Dubhe and Polaris are nearly on one great circle.
        expect(separation(merak, polaris)).toBeCloseTo(gap + reach, -0.5);
    });
    it('the Pole Star is within one degree of the celestial pole', () => {
        expect(90 - star('petite-ourse', 'polaris').dec).toBeLessThan(1);
    });
    it('the Big Dipper and Cassiopeia never set from Paris; Orion does', () => {
        const paris = 48.85;
        for (const id of ['grande-ourse', 'cassiopee'] as const) expect(constellation(id).stars.every(s => circumpolar(s, paris))).toBe(true);
        expect(constellation('orion').stars.some(s => circumpolar(s, paris))).toBe(false);
    });
    it('Orion’s belt is three stars almost in a line', () => {
        const [m, a, z] = ['mintaka', 'alnilam', 'alnitak'].map(id => star('orion', id));
        expect(separation(m!, z!) / (separation(m!, a!) + separation(a!, z!))).toBeGreaterThan(0.99);
        expect(star('orion', 'betelgeuse').color).toBe('rouge');
        expect(star('orion', 'rigel').color).toBe('bleue');
    });
    it('projects with north up and east on the left, as seen from the ground', () => {
        const c = centreOf(constellation('orion').stars);
        const bet = project(star('orion', 'betelgeuse'), c), bel = project(star('orion', 'bellatrix'), c), rig = project(star('orion', 'rigel'), c);
        expect(bet.x).toBeLessThan(bel.x);
        expect(bet.y).toBeLessThan(rig.y);
    });
    it('keeps the true proportions when fitting a figure in a box', () => {
        const stars = constellation('grande-ourse').stars;
        const p = layout(stars, 300, 20);
        const d = (a: string, b: string) => Math.hypot(p.get(a)!.x - p.get(b)!.x, p.get(a)!.y - p.get(b)!.y);
        const sky = (a: string, b: string) => separation(star('grande-ourse', a), star('grande-ourse', b));
        expect(d('dubhe', 'alkaid') / d('dubhe', 'merak')).toBeCloseTo(sky('dubhe', 'alkaid') / sky('dubhe', 'merak'), 1);
    });
    it('the northern scene holds both bears and Cassiopeia once each', () => {
        const ids = northStars().map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toContain('polaris');
        expect(ids).toHaveLength(19);
    });
});
