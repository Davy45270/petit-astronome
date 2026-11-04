// Draws the app icons (a ringed planet and a star on the night sky) as PNG without any dependency.
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const crc = bytes => { let c = 4294967295; for (const b of bytes) { c ^= b; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 3988292384 : 0); } return (c ^ 4294967295) >>> 0; };
const chunk = (name, data) => { const type = Buffer.from(name), length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, checksum]); };
function icon(size, safe) {
    const data = Buffer.alloc((size * 4 + 1) * size), c = size / 2, k = safe ? 0.78 : 1;
    const R = size * 0.25 * k, tilt = -0.35;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x - c, dy = y - c * 1.02;
        const t = Math.hypot(x - c, y - c) / (size * 0.7);
        let col = [Math.round(26 - 16 * t), Math.round(31 - 16 * t), Math.round(94 - 48 * t)];
        // Ring: an ellipse band, behind the planet on top, in front at the bottom.
        const rx = dx * Math.cos(tilt) + dy * Math.sin(tilt), ry = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
        const e = Math.hypot(rx / (R * 1.9), ry / (R * 0.62));
        const inRing = e > 0.78 && e < 1;
        const d = Math.hypot(dx, dy);
        if (inRing && ry < 0) col = [216, 192, 143];
        if (d < R) { const band = Math.floor((dy / R + 1) * 4) % 2; const shade = 1 - Math.max(0, (dx + dy) / (2.2 * R)) * 0.5; col = (band ? [241, 226, 182] : [217, 189, 133]).map(v => Math.round(v * shade)); }
        if (inRing && ry >= 0) col = [216, 192, 143];
        const sx = x - c - size * 0.27 * k, sy = y - c + size * 0.27 * k;
        if (Math.abs(sx) + Math.abs(sy) < size * 0.07 * k && Math.abs(sx) * Math.abs(sy) < size * size * 0.00012) col = [255, 210, 63];
        if (Math.hypot(sx, sy) < size * 0.018 * k) col = [255, 246, 194];
        const i = y * (size * 4 + 1) + 1 + x * 4; data[i] = col[0]; data[i + 1] = col[1]; data[i + 2] = col[2]; data[i + 3] = 255;
    }
    const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(data, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('public/icons', { recursive: true });
for (const [name, size, safe] of [['192', 192, false], ['512', 512, false], ['maskable-512', 512, true]]) writeFileSync(`public/icons/astro-${name}.png`, icon(size, safe));
