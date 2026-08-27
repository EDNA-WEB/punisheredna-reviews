import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

// Zosynchronizuje zoznam kľúčov z registra do databázy (nové pridá, existujúce
// nechá tak — anglický a český preklad, čo tam admin doplnil, sa nikdy neprepíše).
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  await Promise.all(
    TRANSLATION_REGISTRY.map((entry) =>
      prisma.translationString.upsert({
        where: { key: entry.key },
        update: { sk: entry.sk, group: entry.group },
        create: { key: entry.key, group: entry.group, sk: entry.sk }
      })
    )
  );

  const all = await prisma.translationString.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  return NextResponse.json(all);
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: 'Neplatné dáta.' }, { status: 400 });

  await Promise.all(
    items.map((item: { key: string; en?: string; cs?: string }) =>
      prisma.translationString.update({
        where: { key: item.key },
        data: { en: item.en || null, cs: item.cs || null }
      }).catch(() => null)
    )
  );

  return NextResponse.json({ ok: true });
}
