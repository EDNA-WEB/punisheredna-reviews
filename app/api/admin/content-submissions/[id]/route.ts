import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { action, editedBody } = await req.json();
  const submission = await prisma.contentSubmission.findUnique({ where: { id: params.id } });
  if (!submission) return NextResponse.json({ error: 'Návrh nenájdený.' }, { status: 404 });

  if (action === 'approve') {
    const finalBody = (editedBody ?? submission.body).trim();

    if (submission.type === 'TAGS') {
      const movie = await prisma.movie.findUnique({ where: { id: submission.movieId }, select: { tags: true } });
      const existing = movie?.tags ? movie.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const proposed = finalBody.split(',').map((t: string) => t.trim()).filter(Boolean);
      const merged = Array.from(new Set([...existing, ...proposed]));
      await prisma.$transaction([
        prisma.movie.update({ where: { id: submission.movieId }, data: { tags: merged.join(', ') } }),
        prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } })
      ]);
    } else if (submission.type === 'CONTENT') {
      await prisma.$transaction([
        prisma.movie.update({ where: { id: submission.movieId }, data: { synopsis: finalBody } }),
        prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } })
      ]);
    } else if (submission.type === 'TRIVIA') {
      const maxOrder = await prisma.movieTrivia.aggregate({ where: { movieId: submission.movieId }, _max: { order: true } });
      await prisma.$transaction([
        prisma.movieTrivia.create({
          data: { movieId: submission.movieId, text: finalBody, order: (maxOrder._max.order ?? 0) + 1 }
        }),
        prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } })
      ]);
    } else if (submission.type === 'IMAGES') {
      let urls: string[] = [];
      try {
        urls = JSON.parse(finalBody);
        if (!Array.isArray(urls)) urls = [];
      } catch {
        urls = [];
      }
      const maxOrder = await prisma.moviePhoto.aggregate({ where: { movieId: submission.movieId }, _max: { order: true } });
      await prisma.$transaction([
        ...urls.map((url, i) =>
          prisma.moviePhoto.create({
            data: { movieId: submission.movieId, thumbnail: url, full: url, order: (maxOrder._max.order ?? 0) + 1 + i }
          })
        ),
        prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } })
      ]);
    } else {
      // SIMILAR_MOVIES, RELATED_MOVIES, EXTERNAL_REVIEW, WEB — pre tieto typy nemáme
      // v databáze automatické prepojenie (žiadny vhodný vzťah na priame priradenie).
      // Schválenie preto len označí návrh ako vybavený — text slúži admiovi ako
      // informácia, čo má prípadne ručne nastaviť inde (napr. cez Odkazy). Predtým
      // sa toto miesto omylom zapisovalo do synopsis filmu — to bola chyba.
      await prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } });
    }
  } else if (action === 'reject') {
    await prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'REJECTED' } });
  } else {
    return NextResponse.json({ error: 'Neplatná akcia.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
