import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { links } = await req.json();
  // "links" je pole { linkTypeId, url } — nahradí VŠETKY doterajšie odkazy tohto filmu naraz.
  if (!Array.isArray(links)) {
    return NextResponse.json({ error: 'Neplatný formát dát.' }, { status: 400 });
  }
  for (const l of links) {
    if (!l.linkTypeId || !l.url || !String(l.url).trim()) {
      return NextResponse.json({ error: 'Každý zaškrtnutý typ odkazu musí mať vyplnenú URL.' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(l.url)) {
      return NextResponse.json({ error: 'Odkaz musí začínať na http:// alebo https://' }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.movieLink.deleteMany({ where: { movieId: params.id } }),
    ...(links.length > 0
      ? [
          prisma.movieLink.createMany({
            data: links.map((l: any) => ({
              movieId: params.id,
              linkTypeId: l.linkTypeId,
              url: String(l.url).trim()
            }))
          })
        ]
      : [])
  ]);

  return NextResponse.json({ ok: true });
}
