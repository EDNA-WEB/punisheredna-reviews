import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { forgetShareConfig } from '@/lib/articleShare';

export const dynamic = 'force-dynamic';

// { enabled: true|false } — zapnúť / vypnúť zdieľanie
// { rotate: true }         — zneplatniť VŠETKY doteraz rozoslané odkazy
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const json = await req.json().catch(() => ({}));

  const data: { articleShareEnabled?: boolean; articleShareSalt?: string } = {};
  if (typeof json?.enabled === 'boolean') data.articleShareEnabled = json.enabled;
  if (json?.rotate === true) data.articleShareSalt = crypto.randomBytes(9).toString('base64url');
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nic ke změně.' }, { status: 400 });

  const s = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
    select: { articleShareEnabled: true }
  });
  forgetShareConfig();
  return NextResponse.json({ ok: true, enabled: s.articleShareEnabled, rotated: !!data.articleShareSalt });
}
