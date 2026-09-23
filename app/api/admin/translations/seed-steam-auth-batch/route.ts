import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

const SEED: Record<string, { en: string; cs: string }> = {
  'auth.prihlaste_sa_pomocou': { en: 'Log in using your account name', cs: 'Přihlaste se pomocí názvu účtu' },
  'auth.zapamatat_si_ma': { en: 'Remember me', cs: 'Zapamatovat si mě' },
  'auth.pomozte_mi': { en: "Need help logging in?", cs: 'Potřebujete pomoc s přihlášením?' },
  'auth.qr_nadpis': { en: 'Log in with a QR code', cs: 'Přihlášení pomocí QR kódu' },
  'auth.qr_popis': {
    en: "This feature is coming soon — you'll be able to scan the code with the mobile app and log in without entering a password.",
    cs: 'Tato funkce bude brzy dostupná — kód naskenujete mobilní aplikací a přihlásíte se bez zadávání hesla.'
  },
  'auth.vytvorte_si_ucet': { en: 'Create an account', cs: 'Vytvořte si účet' },
  'auth.zopakujte_heslo': { en: 'Confirm password', cs: 'Zopakujte heslo' }
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  let created = 0;
  let updated = 0;

  for (const [key, { en, cs }] of Object.entries(SEED)) {
    const existing = await prisma.translationString.findUnique({ where: { key } });
    if (existing) {
      const data: any = {};
      if (!existing.en) data.en = en;
      if (!existing.cs) data.cs = cs;
      if (Object.keys(data).length > 0) {
        await prisma.translationString.update({ where: { key }, data });
        updated++;
      }
    } else {
      const registryEntry = TRANSLATION_REGISTRY.find((e) => e.key === key);
      await prisma.translationString.create({
        data: { key, group: registryEntry?.group || 'Prihlásenie a registrácia', sk: registryEntry?.sk || key, en, cs }
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, total: Object.keys(SEED).length });
}
