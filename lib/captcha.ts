import { randomInt } from 'crypto';
// Vlastná obrázková CAPTCHA — bez závislosti na externých službách (žiadny API kľúč tretej strany).
// Vygeneruje skreslený text v SVG obrázku a náhodný "šum" v pozadí, ktorý sťažuje
// automatické rozpoznanie strojom, ale ostáva čitateľný pre človeka.

// Vynechané zámerne mätúce znaky: 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Bezpečnosť: kód sa generuje kryptograficky náhodne (nie Math.random) a znaky
// sa v obrázku NEPÍŠU ako text (predtým ich bot prečítal priamo z SVG) — každý
// znak je nakreslený vlastnými čiarami s náhodným posunom bodov, natočením,
// hrúbkou a falošnými čiarami cez text.
export function generateCaptchaCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) code += CHARS[randomInt(CHARS.length)];
  return code;
}

function rand(min: number, max: number): number {
  return (randomInt(1_000_000) / 1_000_000) * (max - min) + min;
}
const pick = <T,>(a: T[]): T => a[randomInt(a.length)];

const COLORS = ['#15171A', '#B80F18', '#3B4A5A', '#6B4423', '#2D5F4A'];

// Čiarové písmo: každý znak = zoznam čiar v mriežke 10 × 14.
type Pt = [number, number];
const GLYPHS: Record<string, Pt[][]> = {
  A: [[[0, 14], [5, 0], [10, 14]], [[2, 9], [8, 9]]],
  B: [[[0, 0], [0, 14], [7, 14], [10, 11], [10, 9], [7, 7], [0, 7]], [[0, 0], [6, 0], [9, 2], [9, 5], [6, 7]]],
  C: [[[10, 2], [7, 0], [3, 0], [0, 3], [0, 11], [3, 14], [7, 14], [10, 12]]],
  D: [[[0, 0], [0, 14], [6, 14], [10, 10], [10, 4], [6, 0], [0, 0]]],
  E: [[[10, 0], [0, 0], [0, 14], [10, 14]], [[0, 7], [7, 7]]],
  F: [[[10, 0], [0, 0], [0, 14]], [[0, 7], [7, 7]]],
  G: [[[10, 2], [7, 0], [3, 0], [0, 3], [0, 11], [3, 14], [7, 14], [10, 11], [10, 8], [6, 8]]],
  H: [[[0, 0], [0, 14]], [[10, 0], [10, 14]], [[0, 7], [10, 7]]],
  J: [[[10, 0], [10, 11], [7, 14], [3, 14], [0, 11]]],
  K: [[[0, 0], [0, 14]], [[10, 0], [0, 8]], [[3, 6], [10, 14]]],
  M: [[[0, 14], [0, 0], [5, 8], [10, 0], [10, 14]]],
  N: [[[0, 14], [0, 0], [10, 14], [10, 0]]],
  P: [[[0, 14], [0, 0], [7, 0], [10, 3], [10, 5], [7, 8], [0, 8]]],
  Q: [[[3, 0], [0, 3], [0, 11], [3, 14], [7, 14], [10, 11], [10, 3], [7, 0], [3, 0]], [[6, 10], [10, 15]]],
  R: [[[0, 14], [0, 0], [7, 0], [10, 3], [10, 5], [7, 8], [0, 8]], [[5, 8], [10, 14]]],
  S: [[[10, 2], [7, 0], [3, 0], [0, 2], [0, 5], [3, 7], [7, 7], [10, 9], [10, 12], [7, 14], [3, 14], [0, 12]]],
  T: [[[0, 0], [10, 0]], [[5, 0], [5, 14]]],
  U: [[[0, 0], [0, 11], [3, 14], [7, 14], [10, 11], [10, 0]]],
  V: [[[0, 0], [5, 14], [10, 0]]],
  W: [[[0, 0], [2, 14], [5, 6], [8, 14], [10, 0]]],
  X: [[[0, 0], [10, 14]], [[10, 0], [0, 14]]],
  Y: [[[0, 0], [5, 7], [10, 0]], [[5, 7], [5, 14]]],
  Z: [[[0, 0], [10, 0], [0, 14], [10, 14]]],
  '2': [[[0, 3], [3, 0], [7, 0], [10, 3], [10, 5], [0, 14], [10, 14]]],
  '3': [[[0, 2], [3, 0], [7, 0], [10, 3], [10, 5], [7, 7], [4, 7]], [[7, 7], [10, 9], [10, 12], [7, 14], [3, 14], [0, 12]]],
  '4': [[[8, 14], [8, 0], [0, 10], [10, 10]]],
  '5': [[[10, 0], [1, 0], [0, 6], [6, 6], [10, 9], [10, 12], [7, 14], [3, 14], [0, 12]]],
  '6': [[[9, 1], [6, 0], [3, 0], [0, 4], [0, 11], [3, 14], [7, 14], [10, 11], [10, 9], [7, 7], [3, 7], [0, 9]]],
  '7': [[[0, 0], [10, 0], [4, 14]]],
  '8': [[[5, 7], [1, 5], [1, 2], [4, 0], [6, 0], [9, 2], [9, 5], [5, 7], [0, 10], [0, 12], [3, 14], [7, 14], [10, 12], [10, 10], [5, 7]]],
  '9': [[[10, 5], [7, 7], [3, 7], [0, 5], [0, 3], [3, 0], [7, 0], [10, 3], [10, 10], [7, 14], [3, 14], [1, 13]]]
};

const f1 = (n: number) => n.toFixed(1);

export function generateCaptchaSvg(code: string): string {
  const width = 200;
  const height = 70;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#F6F5F3" />`;

  // Šumové čiary a bodky v pozadí
  for (let i = 0; i < 6; i++) {
    svg += `<path d="M${f1(rand(0, width))},${f1(rand(0, height))} Q${f1(rand(0, width))},${f1(rand(0, height))} ${f1(rand(0, width))},${f1(rand(0, height))}" stroke="${pick(COLORS)}" stroke-width="1" fill="none" opacity="0.25" />`;
  }
  for (let i = 0; i < 40; i++) {
    svg += `<circle cx="${f1(rand(0, width))}" cy="${f1(rand(0, height))}" r="${f1(rand(0.5, 1.5))}" fill="#15171A" opacity="0.15" />`;
  }

  // Znaky ako čiary (žiadny čitateľný text v SVG)
  const spacing = width / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const glyph = GLYPHS[code[i]];
    if (!glyph) continue;
    const cx = spacing * (i + 1) + rand(-5, 5);
    const cy = height / 2 + rand(-6, 6);
    const scale = rand(2.3, 2.9); // 10 × 14 → cca 25 × 35 px
    const angle = (rand(-22, 22) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const color = pick(COLORS);
    const sw = f1(rand(2.4, 3.4));
    const tf = ([x, y]: Pt): string => {
      const px = (x - 5 + rand(-0.55, 0.55)) * scale;
      const py = (y - 7 + rand(-0.55, 0.55)) * scale;
      return `${f1(cx + px * cos - py * sin)},${f1(cy + px * sin + py * cos)}`;
    };
    const d = glyph.map((line) => 'M' + line.map(tf).join(' L')).join(' ');
    svg += `<path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  // Falošné čiary rovnakej hrúbky cez text — sťažujú strojové rozdelenie znakov
  for (let i = 0; i < 3; i++) {
    svg += `<path d="M${f1(rand(0, 30))},${f1(rand(15, 55))} C${f1(rand(40, 90))},${f1(rand(0, 70))} ${f1(rand(110, 160))},${f1(rand(0, 70))} ${f1(rand(170, 200))},${f1(rand(15, 55))}" stroke="${pick(COLORS)}" stroke-width="${f1(rand(1.6, 2.4))}" fill="none" opacity="0.7" />`;
  }

  svg += '</svg>';
  return svg;
}

export async function verifyCaptcha(token: unknown, answer: unknown): Promise<string | null> {
  const { prisma } = await import('./prisma');

  if (!token || typeof token !== 'string' || !answer || typeof answer !== 'string') {
    return 'Vyplň prosím kód z obrázku.';
  }

  const challenge = await prisma.captchaChallenge.findUnique({ where: { id: token } });

  // Bez ohľadu na výsledok sa výzva okamžite spotrebuje — jeden obrázok, jeden pokus,
  // aby sa nedal skúšať dokola na tom istom obrázku.
  // Atómovo — dva súbežné pokusy s tým istým obrázkom neprejdú oba.
  const { count: claimed } = challenge
    ? await prisma.captchaChallenge.updateMany({ where: { id: token, used: false }, data: { used: true } })
    : { count: 0 };

  if (!challenge || claimed === 0) {
    return 'Kód z obrázku vypršel. Načti si prosím nový.';
  }

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (challenge.createdAt < fifteenMinAgo) {
    return 'Kód z obrázku vypršel. Načti si prosím nový.';
  }

  if (challenge.code.toUpperCase() !== answer.trim().toUpperCase()) {
    return 'Kód z obrázku nesedí. Zkus to prosím znovu.';
  }

  return null;
}
