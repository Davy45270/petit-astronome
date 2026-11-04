import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/ui/style.css', 'utf8');
const token = (name: string): string => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1]!;
const lum = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

it('text colours reach WCAG AA contrast on their backgrounds', () => {
    expect(ratio(token('ink'), token('night'))).toBeGreaterThan(4.5);
    expect(ratio(token('muted'), token('night'))).toBeGreaterThan(4.5);
    expect(ratio(token('ink'), token('card'))).toBeGreaterThan(4.5);
    expect(ratio(token('pill-ink'), token('pill'))).toBeGreaterThan(4.5);
    expect(ratio('#1b1450', token('sun'))).toBeGreaterThan(4.5);
    expect(ratio(token('good-ink'), token('good'))).toBeGreaterThan(4.5);
});
