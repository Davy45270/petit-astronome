/**
 * Real stars: right ascension (hours) and declination (degrees), epoch J2000, visual magnitude.
 * Drawings are a stereographic projection seen from the ground: north up, east on the LEFT.
 */
export type StarColor = 'bleue' | 'blanche' | 'jaune' | 'orange' | 'rouge';

export interface Star {
    id: string;
    name: string;
    ra: number;
    dec: number;
    mag: number;
    color: StarColor
}

export type ConstellationId = 'grande-ourse' | 'petite-ourse' | 'cassiopee' | 'orion' | 'cygne' | 'lion' | 'triangle-ete';

export interface Constellation {
    id: ConstellationId;
    name: string;
    /** What people imagined, for a six-year-old. */
    picture: string;
    season: string;
    stars: Star[];
    lines: [string, string][]
}

const s = (id: string, name: string, ra: number, dec: number, mag: number, color: StarColor = 'blanche'): Star => ({ id, name, ra, dec, mag, color });

export const constellations: readonly Constellation[] = [
    {
        id: 'grande-ourse', name: 'la Grande Ourse', picture: 'une grande casserole, la queue d’une ourse', season: 'toute l’année',
        stars: [
            s('dubhe', 'Dubhé', 11.0621, 61.751, 1.8, 'orange'), s('merak', 'Mérak', 11.0307, 56.383, 2.4),
            s('phecda', 'Phecda', 11.8972, 53.695, 2.4), s('megrez', 'Megrez', 12.2571, 57.033, 3.3),
            s('alioth', 'Alioth', 12.9005, 55.960, 1.8), s('mizar', 'Mizar', 13.3988, 54.925, 2.2),
            s('alkaid', 'Alkaïd', 13.7923, 49.313, 1.9, 'bleue')
        ],
        lines: [['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid']]
    },
    {
        id: 'petite-ourse', name: 'la Petite Ourse', picture: 'une petite casserole, avec l’étoile Polaire au bout du manche', season: 'toute l’année',
        stars: [
            s('polaris', 'l’étoile Polaire', 2.5303, 89.264, 2.0, 'jaune'), s('yildun', 'Yildun', 17.5369, 86.586, 4.4),
            s('eps-umi', 'Epsilon', 16.7662, 82.037, 4.2, 'jaune'), s('zeta-umi', 'Zêta', 15.7344, 77.794, 4.3),
            s('eta-umi', 'Êta', 16.2918, 75.755, 5.0), s('pherkad', 'Pherkad', 15.3456, 71.834, 3.0),
            s('kochab', 'Kochab', 14.8451, 74.156, 2.1, 'orange')
        ],
        lines: [['polaris', 'yildun'], ['yildun', 'eps-umi'], ['eps-umi', 'zeta-umi'], ['zeta-umi', 'eta-umi'], ['eta-umi', 'pherkad'], ['pherkad', 'kochab'], ['kochab', 'zeta-umi']]
    },
    {
        id: 'cassiopee', name: 'Cassiopée', picture: 'un grand W, une reine assise sur son trône', season: 'toute l’année',
        stars: [
            s('caph', 'Caph', 0.1530, 59.150, 2.3), s('schedar', 'Schédar', 0.6751, 56.537, 2.2, 'orange'),
            s('navi', 'Gamma', 0.9451, 60.717, 2.4, 'bleue'), s('ruchbah', 'Ruchbah', 1.4303, 60.235, 2.7),
            s('segin', 'Ségin', 1.9066, 63.670, 3.4, 'bleue')
        ],
        lines: [['caph', 'schedar'], ['schedar', 'navi'], ['navi', 'ruchbah'], ['ruchbah', 'segin']]
    },
    {
        id: 'orion', name: 'Orion', picture: 'un chasseur avec sa ceinture de trois étoiles', season: 'en hiver',
        stars: [
            s('betelgeuse', 'Bételgeuse', 5.9195, 7.407, 0.5, 'rouge'), s('bellatrix', 'Bellatrix', 5.4189, 6.350, 1.6, 'bleue'),
            s('meissa', 'Meissa', 5.5856, 9.934, 3.4, 'bleue'), s('mintaka', 'Mintaka', 5.5334, -0.299, 2.2, 'bleue'),
            s('alnilam', 'Alnilam', 5.6036, -1.202, 1.7, 'bleue'), s('alnitak', 'Alnitak', 5.6793, -1.943, 1.8, 'bleue'),
            s('saiph', 'Saïph', 5.7959, -9.670, 2.1, 'bleue'), s('rigel', 'Rigel', 5.2423, -8.202, 0.1, 'bleue')
        ],
        lines: [['meissa', 'betelgeuse'], ['meissa', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['mintaka', 'rigel']]
    },
    {
        id: 'cygne', name: 'le Cygne', picture: 'un cygne qui vole, ou une grande croix', season: 'en été',
        stars: [
            s('deneb', 'Deneb', 20.6905, 45.280, 1.25), s('sadr', 'Sadr', 20.3705, 40.257, 2.2, 'jaune'),
            s('albireo', 'Albireo', 19.5120, 27.960, 3.1, 'orange'), s('gienah', 'Gienah', 20.7702, 33.970, 2.5, 'orange'),
            s('delta-cyg', 'Delta', 19.7496, 45.131, 2.9, 'bleue')
        ],
        lines: [['deneb', 'sadr'], ['sadr', 'albireo'], ['delta-cyg', 'sadr'], ['sadr', 'gienah']]
    },
    {
        id: 'lion', name: 'le Lion', picture: 'un lion couché, sa tête en forme de point d’interrogation à l’envers', season: 'au printemps',
        stars: [
            s('regulus', 'Régulus', 10.1395, 11.967, 1.4, 'bleue'), s('eta-leo', 'Êta', 10.1222, 16.763, 3.5),
            s('algieba', 'Algieba', 10.3329, 19.841, 2.0, 'orange'), s('adhafera', 'Adhafera', 10.2782, 23.417, 3.4),
            s('mu-leo', 'Mu', 9.8794, 26.007, 3.9, 'orange'), s('eps-leo', 'Epsilon', 9.7642, 23.774, 3.0, 'jaune'),
            s('zosma', 'Zosma', 11.2351, 20.524, 2.6), s('chertan', 'Chertan', 11.2373, 15.430, 3.3),
            s('denebola', 'Dénébola', 11.8177, 14.572, 2.1)
        ],
        lines: [['eps-leo', 'mu-leo'], ['mu-leo', 'adhafera'], ['adhafera', 'algieba'], ['algieba', 'eta-leo'], ['eta-leo', 'regulus'], ['regulus', 'chertan'], ['chertan', 'denebola'], ['denebola', 'zosma'], ['zosma', 'algieba']]
    },
    {
        id: 'triangle-ete', name: 'le Triangle d’été', picture: 'un grand triangle de trois étoiles très brillantes', season: 'en été',
        stars: [s('vega', 'Véga', 18.6156, 38.784, 0.0), s('deneb', 'Deneb', 20.6905, 45.280, 1.25), s('altair', 'Altaïr', 19.8464, 8.868, 0.8)],
        lines: [['vega', 'deneb'], ['deneb', 'altair'], ['altair', 'vega']]
    }
];

export const constellation = (id: ConstellationId): Constellation => constellations.find(c => c.id === id)!;
export const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const rad = Math.PI / 180;

/** Angular distance between two stars, degrees. */
export function separation(a: Pick<Star, 'ra' | 'dec'>, b: Pick<Star, 'ra' | 'dec'>): number {
    const d = Math.sin(a.dec * rad) * Math.sin(b.dec * rad) + Math.cos(a.dec * rad) * Math.cos(b.dec * rad) * Math.cos((a.ra - b.ra) * 15 * rad);
    return Math.acos(Math.min(1, Math.max(-1, d))) / rad;
}

/** A star never sets at this latitude (degrees north) when its declination exceeds 90 − latitude. */
export const circumpolar = (star: Pick<Star, 'dec'>, latitude: number): boolean => star.dec > 90 - latitude;

export interface Point { x: number; y: number }

/** Stereographic projection around a centre; x grows to the west (right on screen), y grows downwards. */
export function project(star: Pick<Star, 'ra' | 'dec'>, centre: Pick<Star, 'ra' | 'dec'>, rotationDeg = 0): Point {
    const d = star.dec * rad, d0 = centre.dec * rad, da = (star.ra - centre.ra) * 15 * rad;
    const k = 2 / (1 + Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(da));
    const x = -k * Math.cos(d) * Math.sin(da);
    const y = -k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(da));
    const r = rotationDeg * rad;
    return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

/** Centre of a group of stars (mean unit vector). */
export function centreOf(stars: Pick<Star, 'ra' | 'dec'>[]): { ra: number; dec: number } {
    let x = 0, y = 0, z = 0;
    for (const st of stars) {
        x += Math.cos(st.dec * rad) * Math.cos(st.ra * 15 * rad);
        y += Math.cos(st.dec * rad) * Math.sin(st.ra * 15 * rad);
        z += Math.sin(st.dec * rad);
    }
    return { ra: ((Math.atan2(y, x) / rad / 15) + 24) % 24, dec: Math.atan2(z, Math.hypot(x, y)) / rad };
}

/** Fit projected stars inside a square box with a margin; keeps proportions (no distortion). */
export function layout(stars: Star[], size: number, margin: number, centre = centreOf(stars), rotationDeg = 0): Map<string, Point> {
    const raw = stars.map(st => [st.id, project(st, centre, rotationDeg)] as const);
    const xs = raw.map(([, p]) => p.x), ys = raw.map(([, p]) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = (size - 2 * margin) / Math.max(maxX - minX, maxY - minY, 1e-9);
    const ox = (size - (maxX - minX) * scale) / 2, oy = (size - (maxY - minY) * scale) / 2;
    return new Map(raw.map(([id, p]) => [id, { x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale }]));
}

/** The northern sky used to find the Pole Star: both bears and Cassiopeia around the pole. */
export const northStars = (): Star[] => {
    const seen = new Set<string>();
    return (['grande-ourse', 'petite-ourse', 'cassiopee'] as const).flatMap(id => constellation(id).stars).filter(st => !seen.has(st.id) && seen.add(st.id));
};
/** A spring evening: the Big Dipper high above the Pole Star. */
export const NORTH_CENTRE = { ra: 0, dec: 90 };
export const NORTH_ROTATION = 0;

export const lineKey = (a: string, b: string): string => [a, b].sort().join('|');
