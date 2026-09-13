import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { url, title } = await req.json();
  if (!url || !String(url).trim()) return NextResponse.json({ error: 'Vlož odkaz na video.' }, { status: 400 });

  const season = await prisma.season.findUnique({ where: { id: params.seasonId } });
  if (!season) return NextResponse.json({ error: 'Séria sa nenašla.' }, { status: 404 });

  const count = await prisma.movieVideo.count({ where: { seasonId: params.seasonId, episodeId: null } });
  if (count >= 10) return NextResponse.json({ error: 'Séria môže mať najviac 10 videí.' }, { status: 400 });

  const video = await prisma.movieVideo.create({
    data: {
      movieId: season.movieId,
      seasonId: params.seasonId,
      url: String(url).trim(),
      title: title || null,
      category: 'trailer',
      order: count
    }
  });

  return NextResponse.json(video);
}
