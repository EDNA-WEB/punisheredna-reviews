import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { body } = await req.json();
  if (!body || !String(body).trim()) {
    return NextResponse.json({ error: 'Návrh obsahu nemôže byť prázdny.' }, { status: 400 });
  }

  const submission = await prisma.contentSubmission.create({
    data: { movieId: params.id, authorId: userId, body: String(body).trim(), status: 'PENDING' }
  });

  return NextResponse.json(submission, { status: 201 });
}
