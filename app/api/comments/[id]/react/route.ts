import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isActiveMember } from '@/lib/membership';

const ALLOWED_EMOJIS = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  if (!isAdmin && !(await isActiveMember(userId))) {
    return NextResponse.json({ error: 'Reakcie na komentáre sú dostupné len pre Golden Ticket členov.' }, { status: 403 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) return NextResponse.json({ error: 'Komentár sa nenašiel.' }, { status: 404 });

  const { emoji } = await req.json();
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Neplatná reakcia.' }, { status: 400 });
  }

  await prisma.commentReaction.upsert({
    where: { commentId_userId: { commentId: params.id, userId } },
    create: { commentId: params.id, userId, emoji },
    update: { emoji }
  });

  const reactions = await prisma.commentReaction.groupBy({
    by: ['emoji'],
    where: { commentId: params.id },
    _count: { emoji: true }
  });

  return NextResponse.json({ reactions: reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji })) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  await prisma.commentReaction.deleteMany({ where: { commentId: params.id, userId } });

  const reactions = await prisma.commentReaction.groupBy({
    by: ['emoji'],
    where: { commentId: params.id },
    _count: { emoji: true }
  });

  return NextResponse.json({ reactions: reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji })) });
}
