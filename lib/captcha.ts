// Vlastná obrázková CAPTCHA — bez závislosti na externých službách (žiadny API kľúč tretej strany).
// Vygeneruje skreslený text v SVG obrázku a náhodný "šum" v pozadí, ktorý sťažuje
// automatické rozpoznanie strojom, ale ostáva čitateľný pre človeka.

// Vynechané zámerne mätúce znaky: 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCaptchaCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const COLORS = ['#15171A', '#B80F18', '#3B4A5A', '#6B4423', '#2D5F4A'];

export function generateCaptchaSvg(code: string): string {
  const width = 200;
  const height = 70;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#F6F5F3" />`;

  // Šumové čiary v pozadí
  for (let i = 0; i < 6; i++) {
    const x1 = rand(0, width);
    const y1 = rand(0, height);
    const x2 = rand(0, width);
    const y2 = rand(0, height);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    svg += `<path d="M${x1},${y1} Q${rand(0, width)},${rand(0, height)} ${x2},${y2}" stroke="${color}" stroke-width="1" fill="none" opacity="0.25" />`;
  }

  // Šumové bodky
  for (let i = 0; i < 40; i++) {
    svg += `<circle cx="${rand(0, width)}" cy="${rand(0, height)}" r="${rand(0.5, 1.5)}" fill="#15171A" opacity="0.15" />`;
  }

  // Samotné znaky, každý s vlastnou rotáciou, farbou a mierne odlišnou pozíciou
  const spacing = width / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = spacing * (i + 1) + rand(-6, 6);
    const y = height / 2 + rand(-8, 8);
    const rotation = rand(-25, 25);
    const size = rand(28, 38);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    svg += `<text x="${x}" y="${y}" font-family="Georgia, serif" font-weight="700" font-size="${size}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation} ${x} ${y})">${char}</text>`;
  }

  svg += '</svg>';
  return svg;
}

export async function verifyCaptcha(token: unknown, answer: unknown): Promise<string | null> {
  const { prisma } = await import('./prisma');

  if (!token || typeof token !== 'string' || !answer || typeof answer !== 'string') {
    return 'Vyplň prosím kód z obrázka.';
  }

  const challenge = await prisma.captchaChallenge.findUnique({ where: { id: token } });

  // Bez ohľadu na výsledok sa výzva okamžite spotrebuje — jeden obrázok, jeden pokus,
  // aby sa nedal skúšať dokola na tom istom obrázku.
  if (challenge && !challenge.used) {
    await prisma.captchaChallenge.update({ where: { id: token }, data: { used: true } });
  }

  if (!challenge || challenge.used) {
    return 'Kód z obrázka vypršal. Načítaj si prosím nový.';
  }

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (challenge.createdAt < fifteenMinAgo) {
    return 'Kód z obrázka vypršal. Načítaj si prosím nový.';
  }

  if (challenge.code.toUpperCase() !== answer.trim().toUpperCase()) {
    return 'Kód z obrázka nesedí. Skús to prosím znova.';
  }

  return null;
}
