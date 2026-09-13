import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { url, title } = await req.json();
  if (!url || !String(url).trim()) return NextResponse.json({ error: 'Vlož odkaz na video.' }, { status: 400 });

  const episode = await prisma.episode.findUnique({ where: { id: params.episodeId }, include: { season: true } });
  if (!episode) return NextResponse.json({ error: 'Epizóda sa nenašla.' }, { status: 404 });

  const count = await prisma.movieVideo.count({ where: { episodeId: params.episodeId } });
  if (count >= 10) return NextResponse.json({ error: 'Epizóda môže mať najviac 10 videí.' }, { status: 400 });

  const video = await prisma.movieVideo.create({
    data: {
      movieId: episode.season.movieId,
      episodeId: params.episodeId,
      url: String(url).trim(),
      title: title || null,
      category: 'trailer',
      order: count
    }
  });

  return NextResponse.json(video);
}
