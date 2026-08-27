import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { videoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { startTime, endTime, text } = await req.json();
  const start = Number(startTime);
  const end = Number(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return NextResponse.json({ error: 'Neplatný časový rozsah — koniec musí byť za začiatkom.' }, { status: 400 });
  }
  if (!text || !String(text).trim()) {
    return NextResponse.json({ error: 'Text titulku nemôže byť prázdny.' }, { status: 400 });
  }
  if (String(text).length > 300) {
    return NextResponse.json({ error: 'Titulok je príliš dlhý (max. 300 znakov).' }, { status: 400 });
  }

  const count = await prisma.videoSubtitle.count({ where: { movieVideoId: params.videoId } });

  const subtitle = await prisma.videoSubtitle.create({
    data: { movieVideoId: params.videoId, startTime: start, endTime: end, text: String(text).trim(), order: count }
  });

  return NextResponse.json(subtitle);
}
