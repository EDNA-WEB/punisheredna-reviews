import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findUserByQuery, loadActivityRows, parseRange } from '@/lib/security/report';

export const dynamic = 'force-dynamic';

// Administrace → Bezpečnost → IP záznamy.
//  GET  ?user=&from=&to=  — záznamy so skrytou časťou IP adresy
//  POST                   — úradná žiadosť: zapíše ju (LegalRequest + AuditLog)
//                           a vráti id výpisu s celými IP adresami
//  PUT                    — zastaviť / povoliť automatické mazanie záznamov používateľa
async function getAdmin() {
  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  return u?.role === 'ADMIN' ? { id: String(u.id), name: String(u.name || 'admin') } : null;
}
const FORBIDDEN = () => NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });

export async function GET(req: Request) {
  if (!(await getAdmin())) return FORBIDDEN();
  const url = new URL(req.url);
  const legal = await prisma.legalRequest.findMany({ where: { provided: { startsWith: 'IP záznamy' } }, orderBy: { receivedAt: 'desc' }, take: 10 });
  const q = url.searchParams.get('user') || '';
  if (!q.trim()) return NextResponse.json({ user: null, rows: [], legal });
  const user = await findUserByQuery(q);
  if (!user) return NextResponse.json({ error: 'Uživatel nenalezen.', legal }, { status: 404 });
  const { fromD, toD } = parseRange(url.searchParams.get('from'), url.searchParams.get('to'));
  const [rows, hold] = await Promise.all([
    loadActivityRows(user.id, fromD, toD, { fullIp: false }),
    prisma.ipLogHold.findUnique({ where: { userId: user.id } })
  ]);
  return NextResponse.json({ user: { id: user.id, name: user.name }, hold: !!hold, rows, legal });
}

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN();
  const b = await req.json().catch(() => ({}));
  const clean = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n);
  const userId = clean(b.userId, 64);
  const authority = clean(b.authority);
  const referenceNo = clean(b.referenceNo);
  const legalBasis = clean(b.legalBasis) || 'Žádost o součinnost (trestní řízení)';
  if (!userId || !authority || referenceNo.length < 3) {
    return NextResponse.json({ error: 'Vyplň orgán, který žádost poslal, a číslo jednací žádosti.' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 });
  const { fromD, toD } = parseRange(clean(b.from, 10), clean(b.to, 10));
  const count = await prisma.activityLog.count({ where: { userId, createdAt: { gte: fromD, lte: toD } } });

  const scope = JSON.stringify({ userId, from: fromD.toISOString(), to: toD.toISOString() });
  const request = await prisma.legalRequest.create({
    data: {
      authority,
      referenceNo,
      legalBasis,
      scope,
      provided: `IP záznamy uživatele ${user.name}: ${count} záznamů`,
      status: 'done',
      handledBy: admin.name,
      note: clean(b.note, 500) || null
    }
  });
  await prisma.auditLog
    .create({
      data: {
        userId: admin.id,
        userName: admin.name,
        action: 'ip_export',
        targetType: 'user',
        targetId: user.id,
        targetTitle: user.name,
        details: `Žádost ${referenceNo} (${authority}), ${fromD.toISOString().slice(0, 10)} – ${toD.toISOString().slice(0, 10)}, ${count} záznamů`
      }
    })
    .catch((err) => console.error('[security] auditLog', err));
  return NextResponse.json({ id: request.id, count });
}

export async function PUT(req: Request) {
  const admin = await getAdmin();
  if (!admin) return FORBIDDEN();
  const b = await req.json().catch(() => ({}));
  const userId = String(b.userId || '').slice(0, 64);
  if (!userId) return NextResponse.json({ error: 'Chybí uživatel.' }, { status: 400 });
  if (b.hold) {
    await prisma.ipLogHold.upsert({
      where: { userId },
      create: { userId, createdBy: admin.name, note: String(b.note || '').slice(0, 300) || null },
      update: {}
    });
  } else {
    await prisma.ipLogHold.deleteMany({ where: { userId } });
  }
  await prisma.auditLog
    .create({
      data: { userId: admin.id, userName: admin.name, action: b.hold ? 'ip_hold_on' : 'ip_hold_off', targetType: 'user', targetId: userId, targetTitle: userId, details: null }
    })
    .catch(() => {});
  return NextResponse.json({ ok: true, hold: !!b.hold });
}
