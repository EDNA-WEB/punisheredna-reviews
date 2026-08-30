import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { ageRating, premieres } = await req.json();
  // "premieres" je pole { country, releaseDate, distributor } — nahradí VŠETKY
  // doterajšie premiéry tohto filmu naraz.
  if (!Array.isArray(premieres)) {
    return NextResponse.json({ error: 'Neplatný formát dát.' }, { status: 400 });
  }
  for (const p of premieres) {
    if (!p.country || !p.releaseDate) {
      return NextResponse.json({ error: 'Každá premiéra musí mať krajinu a dátum.' }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.movie.update({ where: { id: params.id }, data: { ageRating: ageRating || null } }),
    prisma.moviePremiereDate.deleteMany({ where: { movieId: params.id } }),
    ...(premieres.length > 0
      ? [
          prisma.moviePremiereDate.createMany({
            data: premieres.map((p: any) => ({
              movieId: params.id,
              country: p.country,
              releaseDate: new Date(p.releaseDate),
              distributor: p.distributor?.trim() || null
            }))
          })
        ]
      : [])
  ]);

  return NextResponse.json({ ok: true });
}
