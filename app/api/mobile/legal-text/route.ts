import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_RULES_TEXT } from '@/lib/rulesDefaults';
import { DEFAULT_PRIVACY_POLICY_TEXT } from '@/lib/privacyPolicyDefaults';

export const dynamic = 'force-dynamic';

// Rovnaký zdroj textu ako web (/pravidla a /zasady-ochrany-udajov) — appka
// si len text natiahne a naformátuje ho sama (rovnaká "je to nadpis, ak je
// celé veľkými písmenami" logika ako web).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    if (type !== 'rules' && type !== 'privacy') {
      return NextResponse.json({ error: 'Neplatný typ.' }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
    const text = type === 'rules' ? settings?.rulesText || DEFAULT_RULES_TEXT : settings?.privacyPolicyText || DEFAULT_PRIVACY_POLICY_TEXT;

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/legal-text]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
