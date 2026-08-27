import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const movies = await prisma.movie.findMany({ select: { genres: true } });
  const set = new Set<string>();
  for (const m of movies) {
    (m.genres || '').split(',').map((g) => g.trim()).filter(Boolean).forEach((g) => set.add(g));
  }
  return NextResponse.json(Array.from(set).sort());
}
