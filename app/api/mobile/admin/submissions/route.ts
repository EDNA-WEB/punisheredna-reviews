import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Návrhy obsahu od používateľov (obsah, zaujímavosti, tagy, fotky…) čakajúce na schválenie.
export async function GET(req: Request) {
  if (!(await requireMobileAdmin(req))) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const items = await prisma.contentSubmission.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      type: true,
      body: true,
      createdAt: true,
      movie: { select: { id: true, title: true, slug: true, poster: true, year: true } },
      author: { select: { id: true, name: true, avatar: true } }
    }
  });
  return NextResponse.json({ items });
}
