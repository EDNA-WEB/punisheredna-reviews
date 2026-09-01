import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tmdbGetDetails } from '@/lib/tmdb';

export async function GET(_req: Request, { params }: { params: { mediaType: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const mediaType = params.mediaType === 'tv' ? 'tv' : 'movie';
  try {
    const details = await tmdbGetDetails(Number(params.id), mediaType);
    return NextResponse.json(details);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
