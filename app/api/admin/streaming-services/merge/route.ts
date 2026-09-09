import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { keepId, mergeId } = await req.json();
  if (!keepId || !mergeId || keepId === mergeId) {
    return NextResponse.json({ error: 'Chýba platná dvojica služieb na zlúčenie.' }, { status: 400 });
  }

  const [keepService, mergeService] = await Promise.all([
    prisma.streamingService.findUnique({ where: { id: keepId } }),
    prisma.streamingService.findUnique({ where: { id: mergeId } })
  ]);
  if (!keepService || !mergeService) {
    return NextResponse.json({ error: 'Jedna zo služieb neexistuje.' }, { status: 404 });
  }

  const mergeLinks = await prisma.movieStreamingService.findMany({ where: { streamingServiceId: mergeId } });

  let moved = 0;
  let skipped = 0;

  for (const link of mergeLinks) {
    // Ak film už má priradenú aj cieľovú (ponechávanú) službu, druhý záznam
    // by porušil unikátne obmedzenie [movieId, streamingServiceId] — v tom
    // prípade len zmažeme duplicitný riadok a necháme existujúci odkaz.
    const alreadyHasKeep = await prisma.movieStreamingService.findUnique({
      where: { movieId_streamingServiceId: { movieId: link.movieId, streamingServiceId: keepId } }
    });

    if (alreadyHasKeep) {
      await prisma.movieStreamingService.delete({ where: { id: link.id } });
      skipped++;
    } else {
      await prisma.movieStreamingService.update({
        where: { id: link.id },
        data: { streamingServiceId: keepId }
      });
      moved++;
    }
  }

  await prisma.streamingService.delete({ where: { id: mergeId } });
  if (mergeService.icon && mergeService.icon !== keepService.icon) {
    await deleteImageByUrl(mergeService.icon).catch(() => {});
  }

  return NextResponse.json({ ok: true, moved, skipped, keptService: keepService.name, removedService: mergeService.name });
}
