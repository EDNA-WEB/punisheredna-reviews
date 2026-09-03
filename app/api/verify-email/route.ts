import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Chýba overovací token.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { verificationToken: token } });
  if (!user) {
    return NextResponse.json({ error: 'Overovací odkaz je neplatný alebo už bol použitý.' }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null }
  });

  return NextResponse.json({ ok: true });
}
