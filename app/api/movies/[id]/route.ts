import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl, validateSafeUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const movie = await prisma.movie.findUnique({ where: { id: params.id } });
  if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });
  return NextResponse.json(movie);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const data = await req.json();
  if (!data.title || !String(data.title).trim()) {
    return NextResponse.json({ error: 'Názov filmu je povinný.' }, { status: 400 });
  }
  const posterError = validateImageDataUrl(data.poster);
  if (posterError) {
    return NextResponse.json({ error: posterError }, { status: 400 });
  }
  const watchUrlError = validateSafeUrl(data.watchUrl);
  if (watchUrlError) {
    return NextResponse.json({ error: watchUrlError }, { status: 400 });
  }

  const before = await prisma.movie.findUnique({ where: { id: params.id }, select: { poster: true } });

  // Ak prišiel nový obrázok (dátová URL z prehliadača, nie už existujúca adresa),
  // nahráme ho na Cloudinary a do databázy uložíme len jeho trvalú adresu —
  // nikdy znova samotný (veľký) obrázok.
  let posterUrl = data.poster || null;
  console.log('[Cloudinary] poster hodnota začína na:', typeof posterUrl === 'string' ? posterUrl.slice(0, 30) : posterUrl);
  if (posterUrl && posterUrl.startsWith('data:image')) {
    console.log('[Cloudinary] spúšťam nahrávanie...');
    try {
      posterUrl = await uploadImage(posterUrl, 'movies/posters');
      console.log('[Cloudinary] nahraté úspešne, nová adresa:', posterUrl);
    } catch (err: any) {
      console.error('[Cloudinary] NAHRÁVANIE ZLYHALO:', err?.message || err);
      return NextResponse.json({ error: `Nahratie obrázka na Cloudinary zlyhalo: ${err?.message || 'neznáma chyba'}` }, { status: 500 });
    }
  } else {
    console.log('[Cloudinary] preskočené — hodnota nezačína na "data:image" (buď sa nezmenila, alebo je prázdna).');
  }

  const updated = await prisma.movie.update({
    where: { id: params.id },
    data: {
      title: String(data.title).trim(),
      originalTitle: data.originalTitle || null,
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
      watchUrl: data.watchUrl || null,
      nowShowing: (!data.year || Number(data.year) >= 2026) ? !!data.nowShowing : false,
      contentType: data.contentType || 'Film',
      hasSubtitles: !!data.hasSubtitles,
      hasDubbing: !!data.hasDubbing,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      distributor: data.distributor || null,
      budget: data.budget ? BigInt(Math.round(Number(data.budget))) : null,
      marketingBudget: data.marketingBudget ? BigInt(Math.round(Number(data.marketingBudget))) : null,
      boxOffice: data.boxOffice ? BigInt(Math.round(Number(data.boxOffice))) : null,
      domesticBoxOffice: data.domesticBoxOffice ? BigInt(Math.round(Number(data.domesticBoxOffice))) : null,
      internationalBoxOffice: data.internationalBoxOffice ? BigInt(Math.round(Number(data.internationalBoxOffice))) : null
    }
  });

  // Ak sa plagát nahradil novým, starý (nepoužívaný) obrázok z Cloudinary zmažeme.
  if (before?.poster && before.poster !== posterUrl) {
    await deleteImageByUrl(before.poster);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  await prisma.movie.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  const data = await req.json();
  const updateData: any = {};
  if (typeof data.nowShowing === 'boolean') updateData.nowShowing = data.nowShowing;
  if (typeof data.approved === 'boolean') updateData.approved = data.approved;

  const before = await prisma.movie.findUnique({ where: { id: params.id }, select: { approved: true, submittedById: true, title: true, slug: true } });
  const updated = await prisma.movie.update({ where: { id: params.id }, data: updateData });

  if (data.approved === true && before && !before.approved && before.submittedById) {
    await prisma.notification.create({
      data: {
        userId: before.submittedById,
        actorName: 'PunisherEDNA',
        type: 'APPROVED',
        text: `Tvoj návrh filmu "${before.title}" bol schválený a je teraz na webe! Ďakujeme za príspevok.`,
        link: `/movie/${updated.slug}`
      }
    });
  }

  return NextResponse.json({ nowShowing: updated.nowShowing, approved: updated.approved });
}
