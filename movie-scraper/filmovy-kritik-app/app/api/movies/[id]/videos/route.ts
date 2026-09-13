import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CATEGORIES = ['trailer', 'tv_spot', 'ukazka'];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { url, category, title } = await req.json();
  if (!url || !String(url).trim()) return NextResponse.json({ error: 'Zadaj odkaz na video.' }, { status: 400 });
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Neplatná kategória.' }, { status: 400 });

  const count = await prisma.movieVideo.count({ where: { movieId: params.id } });
  if (count >= 30) return NextResponse.json({ error: 'Videí môže byť najviac 30.' }, { status: 400 });

  const video = await prisma.movieVideo.create({
    data: { movieId: params.id, url: String(url).trim(), category, title: title ? String(title).trim() : null, order: count }
  });

  return NextResponse.json(video);
}
