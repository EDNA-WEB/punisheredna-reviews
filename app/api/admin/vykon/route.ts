import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Akcie dashboardu Výkon (len admin).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie.' }, { status: 403 });
  }
  const { action } = await req.json().catch(() => ({ action: null }));
  try {
    if (action === 'enable_pgss') {
      await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
      return NextResponse.json({ message: 'pg_stat_statements je zapnuté.' });
    }
    if (action === 'reset_pgss') {
      await prisma.$queryRawUnsafe('SELECT pg_stat_statements_reset()');
      return NextResponse.json({ message: 'SQL štatistika vynulovaná.' });
    }
    if (action === 'clear_stats') {
      await prisma.$executeRawUnsafe('DELETE FROM "PerfStat"');
      await prisma.$executeRawUnsafe('DELETE FROM "PerfMinute"');
      return NextResponse.json({ message: 'Údaje vymazané.' });
    }
    return NextResponse.json({ error: 'Neznáma akcia.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message?.slice(0, 200) || 'Chyba.' }, { status: 400 });
  }
}
