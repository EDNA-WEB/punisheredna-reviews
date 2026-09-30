import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

// Krátka platnosť — 3 minúty. Ak sa QR kód medzitým nenaskenuje a nepotvrdí,
// jednoducho vyprší a prehliadač si (podľa potreby) vypýta nový.
const EXPIRY_MINUTES = 3;

export async function POST(req: Request) {
  // Ochrana proti zneužitiu — niekto by mohol skúšať vytvárať veľké množstvo
  // relácií za sebou a zbytočne tak zaťažovať server. 20 za 10 minút je pre
  // bežné použitie (vrátane opakovaného obnovenia vypršaného kódu) viac než dosť.
  if (!checkIpRateLimit(req, 'qr-login-create', 10 * 60_000, 20)) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Zkus to prosím za chvíli znovu.' }, { status: 429 });
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000);
  const requestingDevice = req.headers.get('user-agent');

  const session = await prisma.qrLoginSession.create({
    data: { status: 'pending', expiresAt, requestingDevice }
  });

  // Priebežné čistenie starých relácií — bez tohto by tabuľka rástla
  // donekonečna. Nie je to kritická operácia, tak ju spustíme "na pozadí"
  // (bez čakania) a prípadnú chybu len potichu zalogujeme.
  // Výkon: stačí to občas (každé ~10. vytvorenie), nie pri každom kóde.
  if (Math.random() < 0.1) prisma.qrLoginSession
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } } })
    .catch((err) => console.error('[qr-login] Čistenie starých relácií zlyhalo:', err));

  const confirmUrl = `${process.env.NEXTAUTH_URL}/qr-prihlasenie/${session.id}`;
  const qrSvg = await QRCode.toString(confirmUrl, { type: 'svg', margin: 1, width: 256 });

  // ttlSeconds: prehliadač si koniec platnosti počíta podľa SVOJICH hodín —
  // pri rozdielnom čase na počítači a na serveri by inak kód hneď "vypršal"
  // a prehliadač by dookola vytváral nové (to bol zdroj stoviek dopytov).
  return NextResponse.json({ id: session.id, qrSvg, expiresAt: session.expiresAt, ttlSeconds: EXPIRY_MINUTES * 60 });
}
