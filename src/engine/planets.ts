/**
 * The eight planets, in order from the Sun. Mean radius and mean distance come from the
 * planetary fact sheets of the space agencies; they drive both the questions and the true-scale drawings.
 */
export type PlanetId = 'mercure' | 'venus' | 'terre' | 'mars' | 'jupiter' | 'saturne' | 'uranus' | 'neptune';

export interface Planet {
    id: PlanetId;
    name: string;
    /** « de Mercure », « de la Terre »… */
    of: string;
    radiusKm: number;
    /** Mean distance to the Sun, astronomical units. */
    distanceAu: number;
    /** One trip around the Sun, Earth days. */
    yearDays: number;
    family: 'rocheuse' | 'géante';
    clue: string
}

export const SUN_RADIUS_KM = 695_700;
export const MOON_RADIUS_KM = 1_737;
export const MOON_DISTANCE_KM = 384_400;

export const planets: readonly Planet[] = [
    { id: 'mercure', name: 'Mercure', of: 'de Mercure', radiusKm: 2_440, distanceAu: 0.387, yearDays: 88, family: 'rocheuse', clue: 'la plus petite et la plus proche du Soleil, couverte de cratères' },
    { id: 'venus', name: 'Vénus', of: 'de Vénus', radiusKm: 6_052, distanceAu: 0.723, yearDays: 225, family: 'rocheuse', clue: 'la plus chaude, cachée sous d’épais nuages' },
    { id: 'terre', name: 'la Terre', of: 'de la Terre', radiusKm: 6_371, distanceAu: 1, yearDays: 365, family: 'rocheuse', clue: 'notre planète, avec des océans et de la vie' },
    { id: 'mars', name: 'Mars', of: 'de Mars', radiusKm: 3_390, distanceAu: 1.524, yearDays: 687, family: 'rocheuse', clue: 'la planète rouge, couverte de poussière rouillée' },
    { id: 'jupiter', name: 'Jupiter', of: 'de Jupiter', radiusKm: 69_911, distanceAu: 5.203, yearDays: 4_333, family: 'géante', clue: 'la plus grosse, avec une immense tempête rouge' },
    { id: 'saturne', name: 'Saturne', of: 'de Saturne', radiusKm: 58_232, distanceAu: 9.537, yearDays: 10_759, family: 'géante', clue: 'la planète aux grands anneaux brillants' },
    { id: 'uranus', name: 'Uranus', of: 'd’Uranus', radiusKm: 25_362, distanceAu: 19.19, yearDays: 30_687, family: 'géante', clue: 'la planète bleu-vert qui tourne couchée' },
    { id: 'neptune', name: 'Neptune', of: 'de Neptune', radiusKm: 24_622, distanceAu: 30.07, yearDays: 60_190, family: 'géante', clue: 'la plus lointaine, bleu foncé et pleine de vents' }
];

export const planetIds = planets.map(p => p.id);
export const planet = (id: PlanetId): Planet => planets.find(p => p.id === id)!;
/** 1 for Mercury … 8 for Neptune. */
export const rank = (id: PlanetId): number => planetIds.indexOf(id) + 1;
/** Capitalised name for the start of a sentence or a button. */
export const label = (id: PlanetId): string => {
    const n = planet(id).name;
    return n.charAt(0).toUpperCase() + n.slice(1);
};
/** “Le premier mot de la phrase donne la première planète.” — a French mnemonic for the order. */
export const MNEMONIC = ['Me', 'Voici', 'Toute', 'Mouillée,', 'J’ai', 'Suivi', 'Un', 'Nuage'] as const;
