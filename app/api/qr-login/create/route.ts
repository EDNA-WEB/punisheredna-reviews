import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

// Krátka platnosť — 3 minúty. Ak sa QR kód medzitým nenaskenuje a nepotvrdí,
// jednoducho vyprší a prehliadač si (podľa potreby) vypýta nový.
const EXPIRY_MINUTES = 3;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|whatsapp|telegram|discord/i;

export async function POST(req: Request) {
  // Ochrana proti zneužitiu — niekto by mohol skúšať vytvárať veľké množstvo
  // relácií za sebou a zbytočne tak zaťažovať server. 20 za 10 minút je pre
  // bežné použitie (vrátane opakovaného obnovenia vypršaného kódu) viac než dosť.
  if (!checkIpRateLimit(req, 'qr-login-create', 10 * 60_000, 20)) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím za chvíli znovu.' }, { status: 429 });
  }

  const requestingDevice = req.headers.get('user-agent');
  // Výkon: roboty nedostanú QR reláciu (žiadny zápis do databázy).
  if (!requestingDevice || BOT_UA.test(requestingDevice)) {
    return NextResponse.json({ error: 'QR přihlášení není dostupné.' }, { status: 403 });
  }
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000);

  const session = await prisma.qrLoginSession.create({
    data: { status: 'pending', expiresAt, requestingDevice }
  });

  // Priebežné čistenie starých relácií — bez tohto by tabuľka rástla
  // donekonečna. Nie je to kritická operácia, tak ju spustíme "na pozadí"
  // (bez čakania) a prípadnú chybu len potichu zalogujeme.
  // Po dávkach max. 500 riadkov a najviac raz za 10 minút na inštanciu — jedno
  // veľké mazanie (po starej chybe s tisíckami kódov) inak blokovalo tabuľku
  // aj desiatky sekúnd.
  if (Date.now() - ((globalThis as any).__qrCleanupAt || 0) > 10 * 60_000) {
    (globalThis as any).__qrCleanupAt = Date.now();
    prisma.$executeRaw`DELETE FROM "QrLoginSession" WHERE "id" IN (SELECT "id" FROM "QrLoginSession" WHERE "expiresAt" < ${new Date(Date.now() - 60 * 60_000)} LIMIT 500)`
    .catch((err) => console.error('[qr-login] Čistenie starých relácií zlyhalo:', err));
  }

  const confirmUrl = `${process.env.NEXTAUTH_URL}/qr-prihlasenie/${session.id}`;
  const qrSvg = await QRCode.toString(confirmUrl, { type: 'svg', margin: 1, width: 256 });

  // ttlSeconds: prehliadač si koniec platnosti počíta podľa SVOJICH hodín —
  // pri rozdielnom čase na počítači a na serveri by inak kód hneď "vypršal"
  // a prehliadač by dookola vytváral nové (to bol zdroj stoviek dopytov).
  return NextResponse.json({ id: session.id, qrSvg, expiresAt: session.expiresAt, ttlSeconds: EXPIRY_MINUTES * 60 });
}
