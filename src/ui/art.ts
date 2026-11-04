import { planet, planetIds, SUN_RADIUS_KM, MOON_RADIUS_KM, type PlanetId } from '../engine/planets';
import { phase, litShape, type PhaseId } from '../engine/moon';
import { constellation, layout, northStars, NORTH_CENTRE, NORTH_ROTATION, type ConstellationId, type Star, type StarColor, type Point } from '../engine/sky';
import { makeRng } from '../engine/rng';
import type { Art, Scene } from '../engine/questions';

/** Every drawing gets its own gradient ids so several can live on one page. */
let serial = 0;
const uid = (): string => `a${(serial++).toString(36)}`;
const f = (n: number): string => (Math.round(n * 100) / 100).toString();

export const starFill: Record<StarColor, string> = { bleue: '#9cc4ff', blanche: '#f4f6ff', jaune: '#fff1a8', orange: '#ffc078', rouge: '#ff8a6b' };

/* ---------- planets ---------- */

/** Light comes from the left (where the Sun is drawn). */
function shade(u: string, r: number): string {
    return `<radialGradient id="${u}s" cx="0.32" cy="0.36" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
        <circle r="${f(r)}" fill="url(#${u}s)"/>`;
}

function bands(r: number, colors: string[], u: string): string {
    const h = 2 * r / colors.length;
    return `<clipPath id="${u}c"><circle r="${f(r)}"/></clipPath><g clip-path="url(#${u}c)">${colors.map((c, i) => `<rect x="${f(-r)}" y="${f(-r + i * h)}" width="${f(2 * r)}" height="${f(h + 0.5)}" fill="${c}"/>`).join('')}`;
}

/** One planet centred on (0, 0) with radius r. Saturn and Uranus add their rings around it. */
export function planetBody(id: PlanetId, r: number): string {
    const u = uid();
    switch (id) {
        case 'mercure': return `<g><circle r="${f(r)}" fill="#a9a29a"/>${[[-.35, -.3, .18], [.3, .1, .14], [-.1, .4, .12], [.4, -.4, .09], [-.5, .15, .08]].map(([x, y, s]) => `<circle cx="${f(x! * r)}" cy="${f(y! * r)}" r="${f(s! * r)}" fill="#8b847c" stroke="#c2bbb3" stroke-width="${f(r * .03)}"/>`).join('')}${shade(u, r)}</g>`;
        case 'venus': return `<g>${bands(r, ['#f1dfae', '#e9cf8c', '#f3e3b9', '#e4c682', '#efd9a0', '#e6cb8a'], u)}<path d="M${f(-r)} ${f(-r * .1)}q${f(r * .6)} ${f(-r * .25)} ${f(r * 1.2)} 0t${f(r * .9)} 0" stroke="#fbf0d0" stroke-width="${f(r * .12)}" fill="none" opacity=".7"/></g>${shade(u, r)}</g>`;
        case 'terre': return `<g><circle r="${f(r)}" fill="#2f6fd0"/><clipPath id="${u}c"><circle r="${f(r)}"/></clipPath><g clip-path="url(#${u}c)">
            <path d="M${f(-r * .15)} ${f(-r * .75)}c${f(r * .3)} ${f(-r * .1)} ${f(r * .55)} ${f(r * .1)} ${f(r * .5)} ${f(r * .35)}s${f(-r * .05)} ${f(r * .45)} ${f(r * .15)} ${f(r * .75)}s${f(-r * .1)} ${f(r * .55)} ${f(-r * .3)} ${f(r * .5)}s${f(-r * .3)} ${f(-r * .5)} ${f(-r * .25)} ${f(-r * .8)}s${f(-r * .3)} ${f(-r * .45)} ${f(-r * .1)} ${f(-r * .8)}z" fill="#3f9b4b"/>
            <path d="M${f(-r * .95)} ${f(-r * .35)}c${f(r * .25)} ${f(-r * .2)} ${f(r * .45)} ${f(0)} ${f(r * .45)} ${f(r * .25)}s${f(-r * .2)} ${f(r * .5)} ${f(-r * .35)} ${f(r * .55)}z" fill="#5aa84f"/>
            <path d="M${f(-r * .1)} ${f(-r * .1)}c${f(r * .15)} ${f(r * .05)} ${f(r * .2)} ${f(r * .2)} ${f(r * .05)} ${f(r * .3)}" stroke="#c9a66b" stroke-width="${f(r * .14)}" fill="none" stroke-linecap="round"/>
            <ellipse cy="${f(-r * .98)}" rx="${f(r * .6)}" ry="${f(r * .14)}" fill="#f4fbff"/><ellipse cy="${f(r * .98)}" rx="${f(r * .7)}" ry="${f(r * .16)}" fill="#f4fbff"/>
            <path d="M${f(-r * .8)} ${f(r * .1)}q${f(r * .5)} ${f(-r * .2)} ${f(r * .9)} ${f(r * .05)}M${f(r * .1)} ${f(-r * .45)}q${f(r * .4)} ${f(-r * .1)} ${f(r * .7)} ${f(r * .1)}M${f(-r * .5)} ${f(r * .6)}q${f(r * .3)} ${f(-r * .1)} ${f(r * .6)} 0" stroke="#fff" stroke-width="${f(r * .08)}" fill="none" opacity=".75" stroke-linecap="round"/>
            </g>${shade(u, r)}</g>`;
        case 'mars': return `<g><circle r="${f(r)}" fill="#c1502e"/><clipPath id="${u}c"><circle r="${f(r)}"/></clipPath><g clip-path="url(#${u}c)">
            <ellipse cx="${f(-r * .2)}" cy="${f(r * .05)}" rx="${f(r * .55)}" ry="${f(r * .18)}" fill="#8f3a22"/><ellipse cx="${f(r * .35)}" cy="${f(-r * .35)}" rx="${f(r * .3)}" ry="${f(r * .14)}" fill="#a3442a"/>
            <ellipse cy="${f(-r * .97)}" rx="${f(r * .35)}" ry="${f(r * .12)}" fill="#fff4ee"/></g>${shade(u, r)}</g>`;
        case 'jupiter': return `<g>${bands(r, ['#d9c4a5', '#efe2c8', '#b98d64', '#f3e7cf', '#c79a6c', '#e9dcc2', '#b07f57', '#efe3cb', '#cdb08c', '#e2d1b2'], u)}
            <ellipse cx="${f(r * .3)}" cy="${f(r * .32)}" rx="${f(r * .24)}" ry="${f(r * .12)}" fill="#c4623f" stroke="#e8b9a0" stroke-width="${f(r * .03)}"/></g>${shade(u, r)}</g>`;
        case 'saturne': {
            // Ring system drawn with true proportions: outer edge of the main rings 2.3 radii, inner edge 1.2.
            const tilt = -16, k = 0.36;
            const ring = (part: 'back' | 'front'): string => `<g transform="rotate(${tilt})"><clipPath id="${u}${part}"><rect x="${f(-r * 2.5)}" y="${part === 'back' ? f(-r * 2.5) : 0}" width="${f(r * 5)}" height="${f(r * 2.5)}"/></clipPath>
                <g clip-path="url(#${u}${part})" fill="none"><ellipse rx="${f(r * 2.05)}" ry="${f(r * 2.05 * k)}" stroke="#d8c08f" stroke-width="${f(r * .5)}"/><ellipse rx="${f(r * 1.9)}" ry="${f(r * 1.9 * k)}" stroke="#7a6a4f" stroke-width="${f(r * .06)}"/><ellipse rx="${f(r * 1.45)}" ry="${f(r * 1.45 * k)}" stroke="#bfa977" stroke-width="${f(r * .32)}" opacity=".8"/></g></g>`;
            return `<g>${ring('back')}<g>${bands(r, ['#e8d39f', '#f1e2b6', '#d9bd85', '#efdfb0', '#cfb27a', '#ead7a6'], u)}</g>${shade(u, r)}</g>${ring('front')}</g>`;
        }
        case 'uranus': {
            // Rolled on its side: the faint rings stand almost upright.
            const ring = `<ellipse rx="${f(r * .5)}" ry="${f(r * 1.8)}" fill="none" stroke="#c8eef2" stroke-width="${f(r * .05)}" opacity=".85"/>`;
            return `<g><g transform="rotate(-8)">${ring}</g><circle r="${f(r)}" fill="#a7e0e6"/>${shade(u, r)}<clipPath id="${u}f"><rect x="${f(-r * 2)}" y="${f(r * .55)}" width="${f(r * 4)}" height="${f(r * 2)}"/><rect x="${f(-r * 2)}" y="${f(-r * 2.55)}" width="${f(r * 4)}" height="${f(r * 2)}"/></clipPath><g transform="rotate(-8)" clip-path="url(#${u}f)">${ring}</g></g>`;
        }
        case 'neptune': return `<g><circle r="${f(r)}" fill="#3d63d8"/><clipPath id="${u}c"><circle r="${f(r)}"/></clipPath><g clip-path="url(#${u}c)">
            <rect x="${f(-r)}" y="${f(-r * .45)}" width="${f(r * 2)}" height="${f(r * .18)}" fill="#3557c4"/><ellipse cx="${f(-r * .15)}" cy="${f(r * .15)}" rx="${f(r * .22)}" ry="${f(r * .12)}" fill="#22389a"/>
            <path d="M${f(-r * .45)} ${f(r * .02)}q${f(r * .25)} ${f(-r * .06)} ${f(r * .5)} 0M${f(r * .1)} ${f(-r * .55)}q${f(r * .25)} ${f(-r * .05)} ${f(r * .45)} 0" stroke="#e8f0ff" stroke-width="${f(r * .05)}" fill="none" stroke-linecap="round"/></g>${shade(u, r)}</g>`;
    }
}

function sunBody(r: number): string {
    const u = uid();
    return `<radialGradient id="${u}g"><stop offset="0" stop-color="#fff7cc"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
        <radialGradient id="${u}h"><stop offset=".6" stop-color="#ffcf4a" stop-opacity=".45"/><stop offset="1" stop-color="#ffcf4a" stop-opacity="0"/></radialGradient>
        <circle r="${f(r * 1.45)}" fill="url(#${u}h)"/><circle r="${f(r)}" fill="url(#${u}g)"/>
        ${[[-.3, -.2, .07], [.25, .3, .05], [.1, -.45, .04]].map(([x, y, s]) => `<circle cx="${f(x! * r)}" cy="${f(y! * r)}" r="${f(s! * r)}" fill="#e88a0c" opacity=".5"/>`).join('')}`;
}

/** The Moon at a given phase; the dark part keeps a faint glow (earthshine) so the whole disc reads as round. */
export function moonBody(id: PhaseId, r: number): string {
    const u = uid();
    const shape = litShape(phase(id).age);
    const rx = shape.terminator * r;
    // Lit limb from the top to the bottom along `side`, then back along the terminator.
    const limbSweep = shape.side === 'right' ? 1 : 0;
    const termSweep = (shape.side === 'right') === (shape.bulge === 'out') ? 0 : 1;
    const lit = shape.terminator === 1 && shape.bulge === 'out' ? '' : shape.terminator === 1 ? `<circle r="${f(r)}"/>`
        : `<path d="M0 ${f(-r)}A${f(r)} ${f(r)} 0 0 ${limbSweep} 0 ${f(r)}A${f(Math.max(rx, 0.01))} ${f(r)} 0 0 ${termSweep} 0 ${f(-r)}z"/>`;
    const maria = [[-.25, -.25, .22], [.2, -.3, .16], [.1, .15, .25], [-.35, .25, .12], [.35, .35, .1]].map(([x, y, s]) => `<circle cx="${f(x! * r)}" cy="${f(y! * r)}" r="${f(s! * r)}"/>`).join('');
    return `<g><circle r="${f(r)}" fill="#2b3350" stroke="#56618a" stroke-width="${f(Math.max(1, r * .03))}"/>
        <clipPath id="${u}l">${lit || '<rect width="0" height="0"/>'}</clipPath>
        <g clip-path="url(#${u}l)"><circle r="${f(r)}" fill="#ecebe4"/><g fill="#c9c7bd">${maria}</g></g></g>`;
}

function starBody(color: StarColor, r: number): string {
    const u = uid();
    return `<radialGradient id="${u}g"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${starFill[color]}"/><stop offset="1" stop-color="${starFill[color]}" stop-opacity="0"/></radialGradient>
        <circle r="${f(r * 2.4)}" fill="url(#${u}g)"/><path d="M0 ${f(-r * 2.6)}L${f(r * .25)} 0L0 ${f(r * 2.6)}L${f(-r * .25)} 0zM${f(-r * 2.6)} 0L0 ${f(r * .25)}L${f(r * 2.6)} 0L0 ${f(-r * .25)}z" fill="${starFill[color]}" opacity=".8"/><circle r="${f(r)}" fill="#fff"/>`;
}

/* ---------- skies ---------- */

/** Deterministic faint background stars, never tappable. */
function backdropStars(size: number, seed: number, count = 40): string {
    const rng = makeRng(seed);
    return Array.from({ length: count }, () => `<circle cx="${f(rng() * size)}" cy="${f(rng() * size)}" r="${f(0.4 + rng() * 0.8)}" fill="#cfd8ff" opacity="${f(0.25 + rng() * 0.35)}"/>`).join('');
}

/** Brighter stars (smaller magnitude) are drawn larger. */
export const starRadius = (mag: number): number => Math.max(2.2, 6.2 - mag * 1.15);

export interface SkyLayout { size: number; points: Map<string, Point>; stars: Star[] }

export function constellationLayout(id: ConstellationId, size = 300): SkyLayout {
    const stars = constellation(id).stars;
    return { size, stars, points: layout(stars, size, size * 0.12) };
}

export function northLayout(size = 300): SkyLayout {
    const stars = northStars();
    return { size, stars, points: layout(stars, size, size * 0.08, NORTH_CENTRE, NORTH_ROTATION) };
}

function skyStars(sky: SkyLayout, spots = false): string {
    return sky.stars.map(st => {
        const p = sky.points.get(st.id)!;
        const r = starRadius(st.mag);
        return `<g class="sky-star" data-star="${st.id}" transform="translate(${f(p.x)} ${f(p.y)})">${spots ? `<circle class="hit" r="${f(r)}" fill="transparent" data-spot="${st.id}"/>` : ''}<circle r="${f(r * 2.2)}" fill="${starFill[st.color]}" opacity=".18"/><circle r="${f(r)}" fill="${starFill[st.color]}"/></g>`;
    }).join('');
}

export const skyLines = (sky: SkyLayout, lines: [string, string][], cls: string): string => lines.map(([a, b]) => {
    const p = sky.points.get(a)!, q = sky.points.get(b)!;
    return `<line class="${cls}" x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(q.x)}" y2="${f(q.y)}"/>`;
}).join('');

export function constellationSvg(id: ConstellationId, lines: boolean, label: string): string {
    const sky = constellationLayout(id);
    return `<svg class="art sky" viewBox="0 0 300 300" role="img" aria-label="${label}"><rect width="300" height="300" rx="22" class="night"/>${backdropStars(300, id.length * 97)}
        ${lines ? skyLines(sky, constellation(id).lines, 'figure') : ''}${skyStars(sky)}</svg>`;
}

/** The constellation to draw: guide lines optional, drawn lines in their own group. */
export function drawBoardSvg(id: ConstellationId, guide: boolean, drawn: (a: string, b: string) => boolean = () => false): string {
    const sky = constellationLayout(id, 340);
    return `<svg id="board" class="art sky board" viewBox="0 0 340 340" role="img" aria-label="Ciel à relier : ${constellation(id).name}"><rect width="340" height="340" rx="22" class="night"/>${backdropStars(340, 7, 30)}
        <g id="guide">${guide ? skyLines(sky, constellation(id).lines, 'guide-line') : ''}</g><g id="drawn">${skyLines(sky, constellation(id).lines.filter(([a, b]) => drawn(a, b)), 'drawn')}</g><line id="rubber" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>${skyStars(sky)}</svg>`;
}

function northSvg(spots: boolean): string {
    const sky = northLayout(300);
    const lines = (['grande-ourse', 'petite-ourse', 'cassiopee'] as const).flatMap(id => constellation(id).lines);
    return `<svg class="art sky" viewBox="0 0 300 300" role="img" aria-label="Le ciel du nord : Grande Ourse, Petite Ourse, Cassiopée et l’étoile Polaire"><rect width="300" height="300" rx="22" class="night"/>${backdropStars(300, 31)}
        ${spots ? '' : skyLines(sky, [['merak', 'dubhe']], 'pointer')}${skyLines(sky, lines, 'figure')}${skyStars(sky, spots)}<text x="150" y="292" class="cap">nord</text></svg>`;
}

/* ---------- scenes ---------- */

/**
 * Sizes in the line-up keep the true ORDER of sizes but not the true ratio (a square-root scale),
 * otherwise Mercury would be smaller than a pixel next to Jupiter; the caption says so.
 */
export const lineupRadius = (id: PlanetId): number => 4.2 * Math.sqrt(planet(id).radiusKm / 2_440) + 1.2;
const r0 = lineupRadius;

function systemSvg(spots: boolean): string {
    let x = 40;
    const items = planetIds.map(id => {
        // Saturn’s rings reach 2.3 radii: give them room.
        const margin = id === 'saturne' ? r0(id) * 1.4 : 0;
        const r = lineupRadius(id);
        const cx = x + 9 + r + margin;
        x = cx + r + margin + 9;
        return { id, r, cx };
    });
    const scale = 396 / x;
    const body = items.map(({ id, r, cx }) => `<g transform="translate(${f(cx * scale)} 80)" data-planet="${id}">${spots ? `<circle class="hit" r="${f(r * scale)}" fill="transparent" data-spot="${id}"/>` : ''}${planetBody(id, r * scale)}</g>`).join('');
    return `<svg class="art system" viewBox="0 0 400 160" role="img" aria-label="Le Soleil et les huit planètes, de Mercure à Neptune">
        <rect width="400" height="160" rx="20" class="space"/>${backdropStars(400, 11, 30)}
        <g transform="translate(-150 80)">${sunBody(180)}</g>${spots ? '<circle class="hit" cx="0" cy="80" r="30" fill="transparent" data-spot="soleil"/>' : ''}
        ${body}<text x="200" y="150" class="cap">tailles et distances pas à l’échelle</text></svg>`;
}

/** Planets at TRUE relative scale, side by side. */
export function sizesSvg(ids: PlanetId[], spots: boolean): string {
    const max = Math.max(...ids.map(id => planet(id).radiusKm));
    const width = 400, height = 220, gap = spots ? 40 : 14;
    const unit = Math.min((width - gap * (ids.length + 1)) / ids.reduce((s, id) => s + 2 * planet(id).radiusKm, 0), (height - 50) / (2 * max));
    let x = (width - ids.reduce((s, id) => s + 2 * planet(id).radiusKm * unit, 0) - gap * (ids.length - 1)) / 2;
    const body = ids.map(id => {
        const r = planet(id).radiusKm * unit;
        const cx = x + r;
        x += 2 * r + gap;
        return `<g transform="translate(${f(cx)} ${f(height / 2 - 10)})" data-planet="${id}" data-r="${f(r)}">${spots ? `<circle class="hit" r="${f(r)}" fill="transparent" data-spot="${id}"/>` : ''}${planetBody(id, r)}</g>`;
    }).join('');
    return `<svg class="art sizes" viewBox="0 0 ${width} ${height}" role="img" aria-label="Planètes dessinées à la même échelle"><rect width="${width}" height="${height}" rx="20" class="space"/>${backdropStars(width, 5, 25)}${body}<text x="${width / 2}" y="${height - 10}" class="cap">à la même échelle</text></svg>`;
}

function dayNightSvg(sun: 'left' | 'right', spots: boolean): string {
    const s = sun === 'left' ? -1 : 1;
    const u = uid();
    return `<svg class="art daynight" viewBox="0 0 400 220" role="img" aria-label="La Terre éclairée par le Soleil, ${sun === 'left' ? 'à gauche' : 'à droite'}">
        <rect width="400" height="220" rx="20" class="space"/>${backdropStars(400, 3, 25)}
        <g transform="translate(${200 + s * 230} 110)">${sunBody(80)}</g>
        ${[-50, 0, 50].map(dy => `<path d="M${200 + s * 140} ${110 + dy}L${200 + s * 95} ${110 + dy * .8}" class="ray" marker-end="url(#${u}m)"/>`).join('')}
        <marker id="${u}m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffd23f"/></marker>
        <g transform="translate(200 110)">${planetBody('terre', 72)}
            <clipPath id="${u}n"><rect x="${s < 0 ? 0 : -80}" y="-80" width="80" height="160"/></clipPath>
            <circle r="73" fill="#050a24" opacity=".72" clip-path="url(#${u}n)"/>
            <line x1="0" y1="-84" x2="0" y2="84" stroke="#fff" stroke-dasharray="4 5" opacity=".6"/>
            ${spots ? `<path class="hit" data-spot="jour" d="M0 -90A90 90 0 0 ${s < 0 ? 0 : 1} 0 90z" fill="transparent"/><path class="hit" data-spot="nuit" d="M0 -90A90 90 0 0 ${s < 0 ? 1 : 0} 0 90z" fill="transparent"/>` : ''}
            <text x="${s * 38}" y="-60" class="tag">jour</text><text x="${-s * 38}" y="-60" class="tag dim">nuit</text>
        </g></svg>`;
}

function yearSvg(): string {
    const u = uid();
    return `<svg class="art year" viewBox="0 0 400 220" role="img" aria-label="La Terre fait le tour du Soleil en un an">
        <rect width="400" height="220" rx="20" class="space"/>${backdropStars(400, 9, 25)}
        <ellipse cx="200" cy="110" rx="160" ry="72" fill="none" stroke="#8fa3ff" stroke-dasharray="6 6" opacity=".7"/>
        <marker id="${u}m" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c9d4ff"/></marker>
        <path d="M120 175Q200 196 280 175" fill="none" stroke="#c9d4ff" stroke-width="2.5" marker-end="url(#${u}m)"/>
        <g transform="translate(200 110)">${sunBody(34)}</g>
        <g transform="translate(360 110) rotate(23)">${planetBody('terre', 18)}<line y1="-26" y2="26" stroke="#fff" stroke-width="1.5" opacity=".8"/></g>
        <text x="200" y="28" class="tag">1 tour = 1 an = 365 jours</text></svg>`;
}

function sunEarthSvg(): string {
    // True scale: the Sun’s disc and the Earth’s disc with the same unit.
    const sunR = 260, earthR = sunR / (SUN_RADIUS_KM / 6_371);
    const jupiterR = sunR / (SUN_RADIUS_KM / 69_911);
    return `<svg class="art sun-earth" viewBox="0 0 400 220" role="img" aria-label="Le Soleil, Jupiter et la Terre à la même échelle">
        <rect width="400" height="220" rx="20" class="space"/>
        <g transform="translate(-140 110)">${sunBody(sunR)}</g>
        <g transform="translate(250 110)">${planetBody('jupiter', jupiterR)}</g><g transform="translate(330 110)">${planetBody('terre', earthR)}</g>
        <text x="250" y="${f(110 + jupiterR + 18)}" class="tag">Jupiter</text><text x="330" y="${f(110 + earthR + 22)}" class="tag">Terre</text>
        <text x="300" y="206" class="cap">à la même échelle</text></svg>`;
}

function earthMoonSvg(): string {
    const er = 40, mr = er * MOON_RADIUS_KM / 6_371;
    return `<svg class="art earth-moon" viewBox="0 0 400 220" role="img" aria-label="La Lune tourne autour de la Terre">
        <rect width="400" height="220" rx="20" class="space"/>${backdropStars(400, 13, 25)}
        <ellipse cx="170" cy="110" rx="150" ry="58" fill="none" stroke="#8fa3ff" stroke-dasharray="5 6" opacity=".7"/>
        <g transform="translate(170 110)">${planetBody('terre', er)}</g><g transform="translate(305 76)">${moonBody('pleine', mr)}</g>
        <text x="305" y="${f(76 + mr + 18)}" class="tag">Lune</text><text x="200" y="208" class="cap">tailles à l’échelle, distance raccourcie</text></svg>`;
}

function moonOrbitSvg(spots: boolean): string {
    const u = uid();
    // Seen from above the North Pole with the Sun on the left, the Moon goes round anticlockwise:
    // new (towards the Sun), first quarter (bottom), full (away from the Sun), last quarter (top).
    const pos: [PhaseId, number, number][] = [['nouvelle', -105, 0], ['premier-quartier', 0, 78], ['pleine', 105, 0], ['dernier-quartier', 0, -78]];
    return `<svg class="art moon-orbit" viewBox="0 0 400 240" role="img" aria-label="Vue d’en haut : le Soleil à gauche, la Terre au centre, la Lune sur son orbite">
        <rect width="400" height="240" rx="20" class="space"/>
        <g transform="translate(-60 120)">${sunBody(90)}</g>
        <marker id="${u}m" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c9d4ff"/></marker>
        <g transform="translate(240 120)">
            <ellipse rx="105" ry="78" fill="none" stroke="#8fa3ff" stroke-dasharray="5 6" opacity=".7"/>
            <path d="M-74 55A105 78 0 0 0 -30 75" fill="none" stroke="#c9d4ff" stroke-width="2.5" marker-end="url(#${u}m)"/>
            ${planetBody('terre', 24)}<clipPath id="${u}e"><rect x="0" y="-26" width="26" height="52"/></clipPath><circle r="24.5" fill="#050a24" opacity=".7" clip-path="url(#${u}e)"/>
            ${pos.map(([id, x, y]) => `<g transform="translate(${x} ${y})" data-moon="${id}">${spots ? `<circle class="hit" r="13" fill="transparent" data-spot="${id}"/>` : ''}<circle r="13" fill="#2b3350"/><clipPath id="${u}${id}"><rect x="-14" y="-14" width="14" height="28"/></clipPath><circle r="13" fill="#ecebe4" clip-path="url(#${u}${id})"/></g>`).join('')}
        </g><text x="330" y="232" class="cap">vu d’en haut</text></svg>`;
}

function starsSvg(colors: StarColor[], spots: boolean): string {
    const w = 400, step = w / colors.length;
    return `<svg class="art stars" viewBox="0 0 ${w} 200" role="img" aria-label="Des étoiles de couleurs différentes"><rect width="${w}" height="200" rx="20" class="night"/>${backdropStars(w, 21, 25)}
        ${colors.map((c, i) => `<g transform="translate(${f(step * (i + .5))} 95)">${spots ? `<circle class="hit" r="30" fill="transparent" data-spot="etoile-${i}"/>` : ''}${starBody(c, 16)}<text y="88" class="tag">étoile ${c}</text></g>`).join('')}</svg>`;
}

function meteorSvg(): string {
    const u = uid();
    return `<svg class="art meteor" viewBox="0 0 400 200" role="img" aria-label="Une étoile filante traverse le ciel"><rect width="400" height="200" rx="20" class="night"/>${backdropStars(400, 41, 45)}
        <linearGradient id="${u}t" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
        <path d="M60 40L300 130" stroke="url(#${u}t)" stroke-width="5" stroke-linecap="round"/><circle cx="300" cy="130" r="5" fill="#fff"/>
        <path d="M0 200V170q100-30 200-10t200-5V200z" fill="#0b1338"/></svg>`;
}

function galaxySvg(): string {
    const rng = makeRng(77);
    const dots = Array.from({ length: 260 }, () => {
        const arm = Math.floor(rng() * 2), t = rng() * 3.4, a = t + arm * Math.PI, rr = 14 + t * 42;
        const x = Math.cos(a) * rr + (rng() - .5) * 18, y = (Math.sin(a) * rr + (rng() - .5) * 18) * .5;
        return `<circle cx="${f(200 + x)}" cy="${f(100 + y)}" r="${f(.6 + rng() * 1.2)}" fill="${rng() < .2 ? '#ffd9a8' : '#d8e2ff'}" opacity="${f(.4 + rng() * .5)}"/>`;
    }).join('');
    const u = uid();
    return `<svg class="art galaxy" viewBox="0 0 400 200" role="img" aria-label="Une galaxie spirale, comme notre Voie lactée"><rect width="400" height="200" rx="20" class="night"/>
        <radialGradient id="${u}c"><stop offset="0" stop-color="#fff3d1"/><stop offset="1" stop-color="#fff3d1" stop-opacity="0"/></radialGradient>
        <ellipse cx="200" cy="100" rx="60" ry="26" fill="url(#${u}c)"/>${dots}</svg>`;
}

function footprintSvg(): string {
    return `<svg class="art footprint" viewBox="0 0 400 200" role="img" aria-label="Une trace de pas dans la poussière de la Lune"><rect width="400" height="200" rx="20" fill="#8d8a84"/>
        ${[[60, 50, 20], [330, 150, 28], [300, 40, 12], [90, 160, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#7a7771" stroke="#a5a29b" stroke-width="3"/>`).join('')}
        <g transform="translate(200 100) rotate(-12)"><path d="M-30 -62q30-14 60 0l6 120q-36 14-72 0z" fill="#6d6a64"/>${Array.from({ length: 8 }, (_, i) => `<rect x="-30" y="${-50 + i * 13}" width="60" height="5" rx="2" fill="#5b5853"/>`).join('')}</g></svg>`;
}

/** Card-sized drawing for an answer button or the question. */
export function artSvg(art: Art, label = ''): string {
    switch (art.t) {
        case 'planet': return `<svg class="art planet" viewBox="-60 -60 120 120" role="img" aria-label="${label || planet(art.id).name}">${planetBody(art.id, art.id === 'saturne' ? 24 : art.id === 'uranus' ? 30 : 44)}</svg>`;
        case 'sun': return `<svg class="art sun" viewBox="-60 -60 120 120" role="img" aria-label="Le Soleil">${sunBody(38)}</svg>`;
        case 'moon': return `<svg class="art moon" viewBox="-60 -60 120 120" role="img" aria-label="${label || phase(art.phase).name}">${moonBody(art.phase, 46)}</svg>`;
        case 'star': return `<svg class="art star" viewBox="-60 -60 120 120" role="img" aria-label="Une étoile ${art.color}">${starBody(art.color, 14)}</svg>`;
        case 'constellation': return constellationSvg(art.id, art.lines, label || 'Une constellation');
        case 'system': return systemSvg(false);
        case 'sizes': return sizesSvg(art.ids, false);
        case 'sun-earth': return sunEarthSvg();
        case 'daynight': return dayNightSvg(art.sun, false);
        case 'year': return yearSvg();
        case 'earth-moon': return earthMoonSvg();
        case 'moon-orbit': return moonOrbitSvg(false);
        case 'north': return northSvg(false);
        case 'meteor': return meteorSvg();
        case 'galaxy': return galaxySvg();
        case 'footprint': return footprintSvg();
    }
}

/** A scene with tappable targets (`data-spot`). */
export function sceneSvg(scene: Scene): string {
    switch (scene.t) {
        case 'system': return systemSvg(true);
        case 'daynight': return dayNightSvg(scene.sun, true);
        case 'north': return northSvg(true);
        case 'moon-orbit': return moonOrbitSvg(true);
        case 'sizes': return sizesSvg(scene.ids, true);
        case 'stars': return starsSvg(scene.colors, true);
    }
}
