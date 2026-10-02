import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { memoForget } from '@/lib/memoCache';

export const dynamic = 'force-dynamic';

// Zapnutie / vypnutie verejného zdieľania článkov (len admin).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const json = await req.json().catch(() => ({}));
  const enabled = !!json?.enabled;
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { articleShareEnabled: enabled },
    create: { id: 'singleton', articleShareEnabled: enabled }
  });
  memoForget('articleShare:');
  return NextResponse.json({ ok: true, enabled });
}
