import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function canAccess(postId: string, userId: string, isAdmin: boolean) {
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) return null;
  if (post.authorId !== userId && !isAdmin) return null;
  return post;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  const post = await canAccess(params.id, userId, isAdmin);
  if (!post) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const revisions = await prisma.articleRevision.findMany({
    where: { blogPostId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { editedBy: { select: { name: true } } }
  });
  return NextResponse.json(revisions);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  const current = await canAccess(params.id, userId, isAdmin);
  if (!current) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { revisionId } = await req.json();
  const revision = await prisma.articleRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.blogPostId !== params.id) {
    return NextResponse.json({ error: 'Verzia sa nenašla.' }, { status: 404 });
  }

  await prisma.articleRevision.create({
    data: { blogPostId: current.id, title: current.title, body: current.body, coverImage: current.coverImage, editedById: userId }
  });

  const updated = await prisma.blogPost.update({
    where: { id: params.id },
    data: { title: revision.title, body: revision.body, coverImage: revision.coverImage }
  });

  return NextResponse.json(updated);
}
