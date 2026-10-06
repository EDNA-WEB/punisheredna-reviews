import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribe } from '@/lib/email/util';

export const dynamic = 'force-dynamic';

type Flags = { emailNews?: boolean; emailOnline?: boolean; emailMessages?: boolean };
const FIELDS: Record<string, Flags> = {
  news: { emailNews: false },
  online: { emailOnline: false },
  messages: { emailMessages: false },
  all: { emailNews: false, emailOnline: false, emailMessages: false }
};

// Odhlásenie odberu jedným klikom — z odkazu v e-maile (stránka
// /odhlasit-odber) aj z tlačidla „Odhlásit“ priamo v Gmaile/Outlooku
// (hlavička List-Unsubscribe-Post). Bez prihlásenia, overené podpisom.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get('u') || '';
  const t = url.searchParams.get('t') || '';
  const s = url.searchParams.get('s') || '';
  if (!verifyUnsubscribe(u, t, s)) return NextResponse.json({ error: 'Neplatný odkaz.' }, { status: 400 });
  await prisma.user.updateMany({ where: { id: u }, data: FIELDS[t] });
  return NextResponse.json({ ok: true });
}
