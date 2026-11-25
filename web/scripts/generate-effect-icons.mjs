#!/usr/bin/env node
/**
 * يولّد أيقونة SVG لكل تأثير في مكتبة التأثيرات.
 * التشغيل (من مجلد web):  node scripts/generate-effect-icons.mjs
 * الناتج: public/assets/vfx-icons/<id>.svg  (64×64، خلفية متدرجة بلون التأثير ورمز أبيض).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EFFECT_LIBRARY } from "../game/vfx/effects/effectLibrary.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/assets/vfx-icons");
fs.mkdirSync(OUT, { recursive: true });

const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function shade(n, amount) {
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return hex((r << 16) | (g << 8) | b);
}
const pts = (arr) => arr.map((p) => p.join(",")).join(" ");
function star(cx, cy, outer, inner, n, rot = -90) {
  const out = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    out.push([+(cx + Math.cos(a) * r).toFixed(1), +(cy + Math.sin(a) * r).toFixed(1)]);
  }
  return out;
}
const W = (fill = "#fff") => `fill="${fill}" stroke="#0003" stroke-width="1.2" stroke-linejoin="round"`;
const S = (width = 4) => `fill="none" stroke="#fff" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
const cloud = (dy = 0) => `<g ${W()}><circle cx="24" cy="${30 + dy}" r="9"/><circle cx="35" cy="${26 + dy}" r="11"/><circle cx="43" cy="${32 + dy}" r="8"/><rect x="16" y="${31 + dy}" width="34" height="9" rx="4"/></g>`;
const flame = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" ${W()} d="M16 1C17 9 25 12 25 22c0 6-4 10-9 10s-9-4-9-10c0-4 2-6 4-8 0 3 1 4 3 4-2-6 0-12 2-17z"/>`;

const GLYPHS = {
  "electric-shock": () => `<polygon ${W()} points="${pts([[37, 6], [18, 35], [29, 35], [24, 58], [46, 26], [34, 26]])}"/>`,
  freeze: () => `<g ${S()}><path d="M32 8v48M11 20l42 24M53 20L11 44"/><path d="M26 12l6 5 6-5M26 52l6-5 6 5M10 28l8 1-2 8M54 28l-8 1 2 8M10 36l8-1-2-8M54 36l-8-1 2-8" stroke-width="2.5"/></g>`,
  burn: () => flame(14, 10, 1.15),
  explosion: () => `<polygon ${W()} points="${pts(star(32, 32, 27, 13, 9, -80))}"/><polygon fill="#ffe066" points="${pts(star(32, 32, 15, 7, 9, -80))}"/>`,
  poison: () => `<path ${W()} d="M32 6c9 12 15 19 15 28a15 15 0 0 1-30 0c0-9 6-16 15-28z"/><circle cx="26" cy="38" r="3.5" fill="#0003"/><circle cx="37" cy="32" r="2.5" fill="#0003"/><circle cx="38" cy="43" r="2" fill="#0003"/>`,
  "juice-splat": () => `<g ${W()}><circle cx="32" cy="32" r="10"/><circle cx="14" cy="20" r="5"/><circle cx="50" cy="18" r="4.5"/><circle cx="52" cy="42" r="5.5"/><circle cx="16" cy="48" r="4"/><circle cx="34" cy="10" r="3"/><circle cx="32" cy="54" r="3.5"/></g>`,
  "leaf-burst": () => `<path ${W()} d="M12 40C10 22 24 10 46 10c2 22-8 36-28 34z"/><path d="M14 42C24 30 32 24 42 16" fill="none" stroke="#0004" stroke-width="2.5" stroke-linecap="round"/><path ${W()} transform="translate(22 8) scale(.55) rotate(30 32 32)" d="M12 40C10 22 24 10 46 10c2 22-8 36-28 34z"/>`,
  "stun-stars": () => `<polygon ${W()} points="${pts(star(32, 18, 11, 5, 5))}"/><polygon ${W()} points="${pts(star(14, 42, 9, 4, 5))}"/><polygon ${W()} points="${pts(star(50, 42, 9, 4, 5))}"/><ellipse cx="32" cy="50" rx="22" ry="5" fill="none" stroke="#fff6" stroke-width="2.5"/>`,
  slash: () => `<path d="M10 52C26 46 44 30 54 8" ${S(7)}/><path d="M16 56C32 50 50 34 58 14" ${S(3)} opacity=".6"/>`,
  "heavy-smash": () => `<g ${W()}><rect x="29" y="22" width="7" height="34" rx="2" transform="rotate(25 32 40)"/><rect x="14" y="10" width="30" height="17" rx="4" transform="rotate(25 29 18)"/></g><g ${S(3)}><path d="M46 52h10M40 58l8-4M52 46l6-6"/></g>`,
  "lightning-strike": () => `${cloud(-8)}<polygon ${W("#fff27a")} points="${pts([[36, 30], [24, 48], [31, 48], [27, 60], [42, 42], [34, 42]])}"/>`,
  "stone-shatter": () => `<g ${W()}><polygon points="${pts([[10, 40], [22, 14], [32, 30], [24, 46]])}"/><polygon points="${pts([[34, 12], [54, 24], [44, 40], [34, 28]])}"/><polygon points="${pts([[28, 50], [42, 44], [52, 56], [34, 58]])}"/></g>`,
  "magic-sparkle": () => `<polygon ${W()} points="${pts(star(26, 30, 22, 5, 4))}"/><polygon ${W()} points="${pts(star(48, 14, 10, 3, 4))}"/><polygon ${W()} points="${pts(star(48, 50, 8, 2.5, 4))}"/>`,
  "smoke-puff": () => `<g ${W()}><circle cx="22" cy="40" r="11"/><circle cx="36" cy="32" r="14"/><circle cx="46" cy="42" r="9"/><circle cx="32" cy="46" r="10"/></g><g ${S(2.5)} opacity=".7"><path d="M20 20c-4-4 4-6 0-10M34 16c-4-4 4-6 0-10"/></g>`,
  "charge-glow": () => `<circle cx="32" cy="32" r="22" fill="#fff3"/><circle cx="32" cy="32" r="15" fill="#fff6"/><circle cx="32" cy="32" r="8" fill="#fff"/><g ${S(2.5)}><path d="M6 32h8M50 32h8M32 6v8M32 50v8"/></g>`,
  "recoil-pop": () => `<g ${S()}><path d="M44 18L26 32l18 14" /><path d="M56 22L42 32l14 10" stroke-width="3" opacity=".6"/></g><circle cx="16" cy="32" r="7" fill="#fff"/>`,
  "muzzle-flare": () => `<polygon ${W()} points="${pts(star(26, 32, 24, 6, 8, 0))}"/><path d="M40 32h20" ${S(5)}/>`,
  "dirt-pop": () => `<path ${W()} d="M6 50c4-18 14-24 26-24s22 6 26 24z"/><g ${S(3.5)}><path d="M32 26V10M32 14c-6-2-8-6-8-8M32 18c6-2 9-5 9-9"/></g>`,
  "magic-summon": () => `<ellipse cx="32" cy="46" rx="24" ry="8" fill="none" stroke="#fff" stroke-width="3.5"/><ellipse cx="32" cy="46" rx="14" ry="4" fill="none" stroke="#fff9" stroke-width="2.5"/><polygon ${W()} points="${pts(star(32, 24, 14, 5, 5))}"/>`,
  "white-flash": () => `<circle cx="32" cy="32" r="12" fill="#fff"/><g ${S(3.5)}><path d="M32 6v10M32 48v10M6 32h10M48 32h10M14 14l7 7M43 43l7 7M50 14l-7 7M21 43l-7 7"/></g>`,
  "chew-crumbs": () => `<g ${W()}><polygon points="${pts([[10, 22], [20, 14], [30, 20], [27, 32], [14, 34]])}"/><polygon points="${pts([[36, 36], [46, 30], [56, 38], [50, 50], [38, 50]])}"/><polygon points="${pts([[14, 44], [22, 40], [28, 46], [22, 54], [12, 52]])}"/><polygon points="${pts([[38, 12], [46, 10], [50, 18], [42, 22]])}"/></g>`,
  "poof-vanish": () => `${cloud(2)}<polygon ${W("#ffe066")} points="${pts(star(48, 14, 8, 3, 4))}"/><polygon ${W("#ffe066")} points="${pts(star(14, 16, 6, 2.5, 4))}"/>`,
  "coin-pop": () => `<circle cx="32" cy="32" r="22" ${W()}/><circle cx="32" cy="32" r="16" fill="none" stroke="#0003" stroke-width="2.5"/><path d="M32 20v24M26 26c0-4 12-4 12 0s-12 4-12 8 12 4 12 0" fill="none" stroke="#0004" stroke-width="3" stroke-linecap="round"/>`,
  "fire-aura": () => `<circle cx="32" cy="34" r="24" fill="none" stroke="#fff8" stroke-width="3" stroke-dasharray="5 6"/>${flame(20, 16, .8)}`,
  "frost-aura": () => `<circle cx="32" cy="32" r="24" fill="none" stroke="#fff8" stroke-width="3" stroke-dasharray="5 6"/><g ${S(3)}><path d="M32 16v32M18 24l28 16M46 24L18 40"/></g>`,
  "glow-pulse": () => `<circle cx="32" cy="32" r="26" fill="none" stroke="#fff5" stroke-width="3"/><circle cx="32" cy="32" r="18" fill="none" stroke="#fff9" stroke-width="3.5"/><circle cx="32" cy="32" r="9" fill="#fff"/>`
};

let count = 0;
for (const effect of EFFECT_LIBRARY) {
  const glyph = GLYPHS[effect.id];
  if (!glyph) throw new Error(`Missing icon glyph for effect: ${effect.id}`);
  // الألوان الفاتحة جداً (أبيض/أصفر) تُعتَّم حتى يظهر الرمز الأبيض بوضوح.
  const luminance = 0.299 * ((effect.color >> 16) & 255) + 0.587 * ((effect.color >> 8) & 255) + 0.114 * (effect.color & 255);
  const baseNumber = luminance > 215 ? parseInt(shade(effect.color, -120).slice(1), 16)
    : luminance > 170 ? parseInt(shade(effect.color, -60).slice(1), 16) : effect.color;
  const light = shade(baseNumber, 40);
  const dark = shade(baseNumber, -70);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${effect.nameAr}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/>
<rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="#fff4" stroke-width="2"/>
${glyph()}
</svg>
`;
  fs.writeFileSync(path.join(OUT, `${effect.id}.svg`), svg);
  count += 1;
}
console.log(`${count} icons written to ${path.relative(process.cwd(), OUT)}`);
