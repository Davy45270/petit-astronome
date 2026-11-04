export type Mood = 'calme' | 'joie' | 'oups';

/** Lumi, a little star who guides the child. Pure SVG, drawn here. */
export function mascotSvg(mood: Mood, motion: 'full' | 'reduce'): string {
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 21 : 46;
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    const mouth = mood === 'joie' ? '<path d="M-10 10q10 12 20 0" stroke="#5b2a00" stroke-width="3.2" fill="#ff8a6b" stroke-linecap="round"/>'
        : mood === 'oups' ? '<ellipse cx="0" cy="13" rx="5" ry="6" fill="#5b2a00"/>'
            : '<path d="M-8 11q8 7 16 0" stroke="#5b2a00" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    const eyes = mood === 'joie' ? '<path d="M-15 -2q5-6 10 0M5 -2q5-6 10 0" stroke="#5b2a00" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
        : '<circle cx="-10" cy="-2" r="4.2" fill="#5b2a00"/><circle cx="10" cy="-2" r="4.2" fill="#5b2a00"/><circle cx="-8.6" cy="-3.6" r="1.4" fill="#fff"/><circle cx="11.4" cy="-3.6" r="1.4" fill="#fff"/>';
    return `<svg class="mascot ${motion === 'full' ? 'bob' : ''}" data-mood="${mood}" viewBox="-56 -56 112 112" aria-hidden="true">
        <defs><radialGradient id="lumi" cx=".4" cy=".35"><stop offset="0" stop-color="#fff6c2"/><stop offset=".7" stop-color="#ffd23f"/><stop offset="1" stop-color="#f5a30b"/></radialGradient></defs>
        <polygon points="${pts}" fill="url(#lumi)" stroke="#e08a00" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="-19" cy="8" r="5" fill="#ff9f8a" opacity=".6"/><circle cx="19" cy="8" r="5" fill="#ff9f8a" opacity=".6"/>${eyes}${mouth}</svg>`;
}
