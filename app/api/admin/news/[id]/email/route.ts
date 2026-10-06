import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendNewsEmail } from '@/lib/email/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Odoslanie novinky e-mailom odberateľom (Administrace → Novinky).
// ?force=1 pošle znova aj už odoslanú novinku.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const force = new URL(req.url).searchParams.get('force') === '1';
  try {
    const r = await sendNewsEmail(id, force);
    if ('error' in r) return NextResponse.json(r, { status: r.status });
    return NextResponse.json(r);
  } catch (error) {
    console.error('[admin/news/email]', error);
    return NextResponse.json({ error: 'Odeslání se nezdařilo.' }, { status: 500 });
  }
}
