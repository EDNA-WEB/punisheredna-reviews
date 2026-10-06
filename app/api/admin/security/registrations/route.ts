import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FAILED_RESULTS, RESULT_LABELS } from '@/lib/security/registrationLog';

export const dynamic = 'force-dynamic';

// Administrace → Bezpečnost → Pokusy o registraci (súčty, graf, posledné pokusy, CSV).
async function isAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === 'ADMIN';
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const url = new URL(req.url);
  const day = 24 * 60 * 60_000;
  const since30 = new Date(Date.now() - 30 * day);

  if (url.searchParams.get('format') === 'csv') {
    const rows = await prisma.registrationAttempt.findMany({ where: { createdAt: { gte: since30 } }, orderBy: { createdAt: 'desc' }, take: 10000 });
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Čas (UTC)', 'Odkud', 'Výsledek', 'E-mail'].map(esc).join(';'),
      ...rows.map((r) => [r.createdAt.toISOString(), r.source === 'app' ? 'Appka' : 'Web', RESULT_LABELS[r.result] || r.result, r.emailMasked].map(esc).join(';'))
    ].join('\r\n');
    return new Response('﻿' + csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="pokusy-o-registraci.csv"' }
    });
  }

  const failed = FAILED_RESULTS;
  const [summaryRows, reasons, daily, recent, unverified] = await Promise.all([
    prisma.$queryRaw<{ today: number; today_ok: number; week: number; week_prev: number; ok30: number; fail30: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= (date_trunc('day', now() AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'UTC')::int AS today,
        COUNT(*) FILTER (WHERE "result" = 'ok' AND "createdAt" >= (date_trunc('day', now() AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'UTC')::int AS today_ok,
        COUNT(*) FILTER (WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days')::int AS week,
        COUNT(*) FILTER (WHERE "createdAt" < (now() AT TIME ZONE 'UTC') - interval '7 days' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '14 days')::int AS week_prev,
        COUNT(*) FILTER (WHERE "result" = 'ok' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days')::int AS ok30,
        COUNT(*) FILTER (WHERE "result" <> 'ok' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days')::int AS fail30
      FROM "RegistrationAttempt"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '30 days'`,
    prisma.registrationAttempt.groupBy({ by: ['result'], where: { createdAt: { gte: since30 }, result: { in: failed } }, _count: { _all: true } }),
    prisma.$queryRaw<{ d: string; ok: number; fail: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Prague', 'YYYY-MM-DD') AS d,
        COUNT(*) FILTER (WHERE "result" = 'ok')::int AS ok,
        COUNT(*) FILTER (WHERE "result" <> 'ok')::int AS fail
      FROM "RegistrationAttempt"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '14 days'
      GROUP BY 1 ORDER BY 1`,
    prisma.registrationAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, createdAt: true, source: true, result: true, emailMasked: true }
    }),
    prisma.user.count({ where: { mustVerifyEmail: true, emailVerified: false, createdAt: { gte: since30, lt: new Date(Date.now() - 2 * day) } } })
  ]);

  const s = summaryRows[0] || { today: 0, today_ok: 0, week: 0, week_prev: 0, ok30: 0, fail30: 0 };
  const total30 = Number(s.ok30) + Number(s.fail30);

  // 14 dní vrátane dní bez pokusov.
  const byDay = new Map(daily.map((r) => [r.d, r]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * day).toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
    const r = byDay.get(d);
    return { day: d, ok: Number(r?.ok || 0), fail: Number(r?.fail || 0) };
  });

  const reasonCount = new Map(reasons.map((r) => [r.result, r._count._all]));
  return NextResponse.json({
    summary: {
      today: Number(s.today),
      todayOk: Number(s.today_ok),
      week: Number(s.week),
      weekPrev: Number(s.week_prev),
      ok30: Number(s.ok30),
      fail30: Number(s.fail30),
      okShare: total30 ? Math.round((Number(s.ok30) / total30) * 100) : 0
    },
    reasons: [
      ...['disposable', 'rate_limit', 'exists', 'invalid', 'bot', 'disabled', 'error'].map((k) => ({ key: k, label: RESULT_LABELS[k], count: reasonCount.get(k) || 0 })),
      { key: 'unverified', label: 'Neověřil e-mail do 48 h', count: unverified }
    ],
    days,
    recent: recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), label: RESULT_LABELS[r.result] || r.result }))
  });
}
