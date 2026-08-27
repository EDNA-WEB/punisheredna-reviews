import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const post = await prisma.blogPost.findUnique({ where: { id: params.id }, include: { author: { select: { name: true } } } });
  if (!post) return NextResponse.json({ error: 'Článok sa nenašiel.' }, { status: 404 });
  if (post.authorId !== userId) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  if (post.published) return NextResponse.json({ error: 'Tento článok je už publikovaný.' }, { status: 400 });
  if (post.publicationRequested) return NextResponse.json({ error: 'O publikáciu si už požiadal(a).' }, { status: 400 });

  await prisma.blogPost.update({ where: { id: params.id }, data: { publicationRequested: true } });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        actorName: post.author.name,
        type: 'BLOG_PUBLISH_REQUEST',
        text: `${post.author.name} požiadal(a) o publikáciu článku "${post.title}" na hlavnú stránku`,
        link: `/blog/${post.id}`
      }))
    });
  }

  return NextResponse.json({ ok: true });
}
