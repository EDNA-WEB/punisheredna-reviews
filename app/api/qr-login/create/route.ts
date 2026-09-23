import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

// Krátka platnosť — 3 minúty. Ak sa QR kód medzitým nenaskenuje a nepotvrdí,
// jednoducho vyprší a prehliadač si (podľa potreby) vypýta nový.
const EXPIRY_MINUTES = 3;

export async function POST() {
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000);
  const session = await prisma.qrLoginSession.create({ data: { status: 'pending', expiresAt } });

  const confirmUrl = `${process.env.NEXTAUTH_URL}/qr-prihlasenie/${session.id}`;
  const qrSvg = await QRCode.toString(confirmUrl, { type: 'svg', margin: 1, width: 256 });

  return NextResponse.json({ id: session.id, qrSvg, expiresAt: session.expiresAt });
}
