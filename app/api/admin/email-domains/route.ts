import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkEmailAllowed, disposableStats, resetDisposableCache } from '@/lib/disposableEmail';

export const dynamic = 'force-dynamic';

// Administrace → Blokované e-maily: vlastné blokované a povolené domény,
// stav komunitných zoznamov a test ľubovoľnej adresy.
async function isAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === 'ADMIN';
}
const FORBIDDEN = () => NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
const cleanDomain = (v: unknown) =>
  String(v || '')
    .toLowerCase()
    .trim()
    .replace(/^.*@/, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .slice(0, 190);

export async function GET(req: Request) {
  if (!(await isAdmin())) return FORBIDDEN();
  const test = new URL(req.url).searchParams.get('test');
  if (test) return NextResponse.json({ result: await checkEmailAllowed(test.includes('@') ? test : `test@${test}`) });
  const [rules, stats] = await Promise.all([prisma.emailDomainRule.findMany({ orderBy: { createdAt: 'desc' } }), disposableStats()]);
  return NextResponse.json({ rules, stats });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return FORBIDDEN();
  const body = await req.json().catch(() => ({}));
  const domain = cleanDomain(body?.domain);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return NextResponse.json({ error: 'Zadej platnou doménu, např. priklad.cz' }, { status: 400 });
  const allow = body?.allow === true;
  const note = typeof body?.note === 'string' ? body.note.slice(0, 200) : null;
  const rule = await prisma.emailDomainRule.upsert({ where: { domain }, create: { domain, allow, note }, update: { allow, note } });
  resetDisposableCache();
  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return FORBIDDEN();
  const domain = cleanDomain(new URL(req.url).searchParams.get('domain'));
  await prisma.emailDomainRule.deleteMany({ where: { domain } });
  resetDisposableCache();
  return NextResponse.json({ ok: true });
}
