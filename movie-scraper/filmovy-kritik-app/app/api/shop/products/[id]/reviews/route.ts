import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { rating, body } = await req.json();
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'Hodnotenie musí byť 1 až 5.' }, { status: 400 });
  }

  const review = await prisma.shopReview.upsert({
    where: { productId_userId: { productId: params.id, userId } },
    update: { rating: ratingNum, body: body?.trim() || null },
    create: { productId: params.id, userId, rating: ratingNum, body: body?.trim() || null },
    include: { user: { select: { name: true, avatar: true } } }
  });

  return NextResponse.json(review);
}
