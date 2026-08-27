import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';

export async function GET() {
  const premieres = await prisma.premiere.findMany({ orderBy: { releaseDate: 'asc' } });
  return NextResponse.json(premieres);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { title, releaseDate, year, country, genres, director, poster } = await req.json();
  if (!title || !String(title).trim() || !releaseDate) {
    return NextResponse.json({ error: 'Názov a dátum premiéry sú povinné.' }, { status: 400 });
  }

  let posterUrl = poster || null;
  if (posterUrl && posterUrl.startsWith('data:image')) {
    posterUrl = await uploadImage(posterUrl, 'premieres');
  }

  const premiere = await prisma.premiere.create({
    data: {
      title: String(title).trim(),
      releaseDate: new Date(releaseDate),
      year: year || null,
      country: country || null,
      genres: genres || null,
      director: director || null,
      poster: posterUrl
    }
  });

  return NextResponse.json(premiere, { status: 201 });
}
