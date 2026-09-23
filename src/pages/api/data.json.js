import { prisma } from '../../../lib/prisma'; // ⚠️ Skontroluj cestu k tvojmu prisma klientovi

export const prerender = false; // Dôležité pre Astro: vypne statické generovanie pre tento endpoint

export async function GET() {
  try {
    // ⚠️ Zmeň 'review' na názov tvojho modelu v schema.prisma (napr. post, movie, review...)
    const data = await prisma.review.findMany({
      take: 20,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Povoliť prístup pre mobilnú aplikáciu
      },
    });
  } catch (error) {
    console.error('Astro API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Chyba pri načítaní dát z databázy Neon' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}