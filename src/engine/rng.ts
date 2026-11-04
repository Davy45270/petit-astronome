/** Deterministic generator (same algorithm as a 32-bit mulberry). The engine never calls Math.random. */
export function makeRng(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (value + 1831565813) >>> 0;
        let t = value;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}

export const pick = <T>(items: readonly T[], rng: () => number): T => items[Math.floor(rng() * items.length)]!;
