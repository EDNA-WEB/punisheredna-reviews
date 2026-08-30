import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { action, editedBody } = await req.json();
  const submission = await prisma.contentSubmission.findUnique({ where: { id: params.id } });
  if (!submission) return NextResponse.json({ error: 'Návrh nenájdený.' }, { status: 404 });

  if (action === 'approve') {
    const finalBody = (editedBody ?? submission.body).trim();
    await prisma.$transaction([
      prisma.movie.update({ where: { id: submission.movieId }, data: { synopsis: finalBody } }),
      prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'APPROVED', body: finalBody } })
    ]);
  } else if (action === 'reject') {
    await prisma.contentSubmission.update({ where: { id: params.id }, data: { status: 'REJECTED' } });
  } else {
    return NextResponse.json({ error: 'Neplatná akcia.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
