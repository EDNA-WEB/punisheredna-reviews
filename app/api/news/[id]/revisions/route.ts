import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const revisions = await prisma.articleRevision.findMany({
    where: { newsPostId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { editedBy: { select: { name: true } } }
  });
  return NextResponse.json(revisions);
}

// Vráti novinku k stavu, aký mala v danej staršej verzii — no predtým si BEZPEČNE
// uloží aj JEJ aktuálny (teraz už "starý") stav ako ďalšiu revíziu, takže sa
// obnovením nikdy nič nestratí, dá sa vrátiť aj sem naspäť.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const { revisionId } = await req.json();

  const [current, revision] = await Promise.all([
    prisma.newsPost.findUnique({ where: { id: params.id } }),
    prisma.articleRevision.findUnique({ where: { id: revisionId } })
  ]);
  if (!current || !revision || revision.newsPostId !== params.id) {
    return NextResponse.json({ error: 'Verzia sa nenašla.' }, { status: 404 });
  }

  await prisma.articleRevision.create({
    data: {
      newsPostId: current.id,
      title: current.title,
      summary: current.summary,
      body: current.body,
      coverImage: current.coverImage,
      editedById: (session.user as any).id
    }
  });

  const updated = await prisma.newsPost.update({
    where: { id: params.id },
    data: { title: revision.title, summary: revision.summary || '', body: revision.body, coverImage: revision.coverImage }
  });

  return NextResponse.json(updated);
}
