import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Uloženie: buď "MIX" (žiadne uprednostňovanie), alebo zoznam kódov
// jazykov oddelený čiarkou v poradí priority, napr. "cs,sk".
export async function GET(req: Request) {
  const me = await getMobileUser(req);
  if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { reviewLanguages: true } });
  return NextResponse.json({ value: user?.reviewLanguages || 'cs' }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { value } = await req.json();
    if (!value || typeof value !== 'string') return NextResponse.json({ error: 'Neplatná hodnota.' }, { status: 400 });

    await prisma.user.update({ where: { id: me.id }, data: { reviewLanguages: value } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/review-languages]', error);
    return NextResponse.json({ error: 'Uložení se nezdařilo.' }, { status: 400 });
  }
}
