import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemAccount } from '@/lib/recoveryCode';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { body } = await req.json();
  if (!body || !String(body).trim()) {
    return NextResponse.json({ error: 'Text správy nemôže byť prázdny.' }, { status: 400 });
  }
  if (String(body).length > 5000) {
    return NextResponse.json({ error: 'Text je príliš dlhý (max. 5000 znakov).' }, { status: 400 });
  }

  const system = await getOrCreateSystemAccount();

  const recipients = await prisma.user.findMany({
    where: { banned: false, id: { not: system.id } },
    select: { id: true }
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Nemáš žiadnych príjemcov na odoslanie.' }, { status: 400 });
  }

  await prisma.message.createMany({
    data: recipients.map((r) => ({ senderId: system.id, receiverId: r.id, body: String(body).trim() }))
  });

  return NextResponse.json({ ok: true, count: recipients.length });
}
