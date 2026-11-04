/**
 * Moon phases as seen from the northern hemisphere (France): a growing Moon is lit on the right.
 * Age is in days since the new Moon; the synodic month lasts 29.53 days.
 */
export const SYNODIC_DAYS = 29.53;

export type PhaseId = 'nouvelle' | 'premier-croissant' | 'premier-quartier' | 'gibbeuse-croissante' | 'pleine' | 'gibbeuse-decroissante' | 'dernier-quartier' | 'dernier-croissant';

export interface Phase {
    id: PhaseId;
    name: string;
    /** Days since the new Moon at the middle of the phase. */
    age: number
}

const names: [PhaseId, string][] = [
    ['nouvelle', 'Nouvelle lune'],
    ['premier-croissant', 'Premier croissant'],
    ['premier-quartier', 'Premier quartier'],
    ['gibbeuse-croissante', 'Lune gibbeuse croissante'],
    ['pleine', 'Pleine lune'],
    ['gibbeuse-decroissante', 'Lune gibbeuse décroissante'],
    ['dernier-quartier', 'Dernier quartier'],
    ['dernier-croissant', 'Dernier croissant']
];

export const phases: readonly Phase[] = names.map(([id, name], i) => ({ id, name, age: i * SYNODIC_DAYS / 8 }));
export const phase = (id: PhaseId): Phase => phases.find(p => p.id === id)!;
export const phaseIds = phases.map(p => p.id);

/** Fraction of the visible disc that is lit, 0 (new) … 1 (full). */
export const illumination = (age: number): number => (1 - Math.cos(2 * Math.PI * age / SYNODIC_DAYS)) / 2;

/** Growing between the new and the full Moon. */
export const waxing = (age: number): boolean => {
    const a = ((age % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
    return a > 0 && a < SYNODIC_DAYS / 2;
};

/**
 * Shape of the lit part: one lit half (the limb on `side`) plus or minus a half-ellipse whose
 * horizontal semi-axis is `terminator` × radius. `bulge` says on which side the terminator curves.
 * Lit area = ½ ± ½·terminator, which equals `illumination(age)`.
 */
export function litShape(age: number): { side: 'right' | 'left'; terminator: number; bulge: 'out' | 'in' } {
    const theta = 2 * Math.PI * age / SYNODIC_DAYS;
    const c = Math.cos(theta);
    return {
        side: waxing(age) || age % SYNODIC_DAYS === 0 ? 'right' : 'left',
        terminator: Math.abs(c),
        // Crescent: the terminator bulges towards the lit limb (less than half lit).
        bulge: c > 0 ? 'out' : 'in'
    };
}

export const litFraction = (age: number): number => {
    const s = litShape(age);
    return s.bulge === 'out' ? (1 - s.terminator) / 2 : (1 + s.terminator) / 2;
};
