import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage } from '@/lib/cloudinary';
import { validateSafeUrl } from '@/lib/validateUpload';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 100;
  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, title: true, year: true, slug: true, poster: true }
  });
  return NextResponse.json(movies);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
  }

  const data = await req.json();
  if (!data.title || !String(data.title).trim()) {
    return NextResponse.json({ error: 'Názov filmu je povinný.' }, { status: 400 });
  }

  const duplicate = await prisma.movie.findFirst({
    where: {
      title: { equals: String(data.title).trim(), mode: 'insensitive' },
      ...(data.year ? { year: data.year } : {})
    },
    select: { slug: true }
  });
  if (duplicate) {
    return NextResponse.json(
      { error: 'Film s týmto názvom (a rokom) už v databáze existuje.', existingSlug: duplicate.slug },
      { status: 409 }
    );
  }

  const posterError = validateImageDataUrl(data.poster);
  if (posterError) {
    return NextResponse.json({ error: posterError }, { status: 400 });
  }
  const watchUrlError = validateSafeUrl(data.watchUrl);
  if (watchUrlError) {
    return NextResponse.json({ error: watchUrlError }, { status: 400 });
  }

  let slug = slugify(data.title);
  if (!slug) slug = 'film';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.movie.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  let posterUrl = data.poster || null;
  if (posterUrl && posterUrl.startsWith('data:image')) {
    posterUrl = await uploadImage(posterUrl, 'movies/posters');
  }

  const movie = await prisma.movie.create({
    data: {
      title: String(data.title).trim(),
      originalTitle: data.originalTitle || null,
      slug: uniqueSlug,
      poster: posterUrl,
      genres: data.genres || null,
      countries: data.countries || null,
      year: data.year || null,
      runtimeMinutes: data.runtimeMinutes ? Number(data.runtimeMinutes) : null,
      director: data.director || null,
      screenplay: data.screenplay || null,
      cinematography: data.cinematography || null,
      music: data.music || null,
      cast: data.cast || null,
      synopsis: data.synopsis || null,
      trailerUrl: data.trailerUrl || null,
      watchUrl: isAdmin ? data.watchUrl || null : null,
      nowShowing: isAdmin && (!data.year || Number(data.year) >= 2026) ? !!data.nowShowing : false,
      contentType: data.contentType || 'Film',
      hasSubtitles: !!data.hasSubtitles,
      hasDubbing: !!data.hasDubbing,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      distributor: data.distributor || null,
      budget: isAdmin && data.budget ? BigInt(Math.round(Number(data.budget))) : null,
      marketingBudget: isAdmin && data.marketingBudget ? BigInt(Math.round(Number(data.marketingBudget))) : null,
      boxOffice: isAdmin && data.boxOffice ? BigInt(Math.round(Number(data.boxOffice))) : null,
      domesticBoxOffice: isAdmin && data.domesticBoxOffice ? BigInt(Math.round(Number(data.domesticBoxOffice))) : null,
      internationalBoxOffice: isAdmin && data.internationalBoxOffice ? BigInt(Math.round(Number(data.internationalBoxOffice))) : null,
      tmdbId: data.tmdbId ? Number(data.tmdbId) : null,
      approved: isAdmin,
      submittedById: isAdmin ? null : userId
    }
  });

  return NextResponse.json(movie, { status: 201 });
}
