import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // uprav podľa skutočnej cesty k vašim next-auth nastaveniam
import { parseImportFile } from '@/lib/import/parse';
import { processImportItems } from '@/lib/import/processImport';

// Táto route je pod /api/admin/..., takže ju NEPOKRYJE existujúci middleware.ts
// (ten má matcher len na '/admin/:path*'). Kontrola role je preto priamo tu.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    const f = formData.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'Neplatné dáta formulára.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'Súbor nebol nájdený vo formulári.' }, { status: 400 });
  }

  const text = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json');

  try {
    const items = parseImportFile(text, isJson ? 'json' : 'csv');
    if (items.length === 0) {
      return NextResponse.json({ error: 'Súbor neobsahuje žiadne položky na import.' }, { status: 400 });
    }
    const results = await processImportItems(items);
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: `Chyba pri spracovaní súboru: ${err.message}` }, { status: 400 });
  }
}
