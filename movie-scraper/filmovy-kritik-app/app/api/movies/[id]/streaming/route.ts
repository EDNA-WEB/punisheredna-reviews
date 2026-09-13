import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { services } = await req.json();
  // "services" je pole { streamingServiceId, url } — nahradí VŠETKY doterajšie
  // priradenia tohto filmu naraz (jednoduchšie než dopočítavať rozdiely).
  if (!Array.isArray(services)) {
    return NextResponse.json({ error: 'Neplatný formát dát.' }, { status: 400 });
  }
  for (const s of services) {
    if (!s.streamingServiceId || !s.url || !String(s.url).trim()) {
      return NextResponse.json({ error: 'Každá zaškrtnutá služba musí mať vyplnený odkaz.' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(s.url)) {
      return NextResponse.json({ error: 'Odkaz musí začínať na http:// alebo https://' }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.movieStreamingService.deleteMany({ where: { movieId: params.id } }),
    ...(services.length > 0
      ? [
          prisma.movieStreamingService.createMany({
            data: services.map((s: any) => ({
              movieId: params.id,
              streamingServiceId: s.streamingServiceId,
              url: String(s.url).trim()
            }))
          })
        ]
      : [])
  ]);

  return NextResponse.json({ ok: true });
}
