import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ⚠️ Ak máte cestu k prisma klientovi inú (napr. '@/prisma'), upravte ju

export async function GET() {
  try {
    // ⚠️ Zmeň 'review' na presný názov tvojho modelu z prisma.schema (napr. film, movie, post...)
    const data = await prisma.review.findMany({
      take: 20,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Chyba pri načítaní dát z databázy' },
      { status: 500 }
    );
  }
}