import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tmdbSearchPerson } from '@/lib/tmdb';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  if (!query || !query.trim()) return NextResponse.json({ error: 'Zadaj meno na vyhľadanie.' }, { status: 400 });

  try {
    const results = await tmdbSearchPerson(query.trim());
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
