import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkIpRateLimit } from '@/lib/ipRateLimit';

import { hasInjectedObject } from '@/lib/inputGuard';
export async function POST(req: Request) {
  try {
    if (!checkIpRateLimit(req, 'trailer-view', 60_000, 30)) {
      return NextResponse.json({ error: 'Příliš mnoho požadavků.' }, { status: 429 });
    }

    const { trailerId } = await req.json();
    if (hasInjectedObject(trailerId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!trailerId) return NextResponse.json({ error: 'Chýba trailerId.' }, { status: 400 });

    // Tá istá IP adresa sa do rebríčka jedného trailera započíta najviac raz za 5 minút —
    // zabráni to umelému nahusteniu poradia opakovaným odosielaním z jedného miesta.
    if (!checkIpRateLimit(req, `trailer-view-${trailerId}`, 5 * 60_000, 1)) {
      return NextResponse.json({ ok: true });
    }

    const video = await prisma.movieVideo.findUnique({ where: { id: trailerId } });
    if (!video) return NextResponse.json({ error: 'Trailer se nenašel.' }, { status: 404 });

    await prisma.trailerView.create({ data: { movieVideoId: trailerId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Zlyhalo.' }, { status: 500 });
  }
}
