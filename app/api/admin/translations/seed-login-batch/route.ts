import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

// Jednorazové doplnenie EN/CS prekladov pre prihlasovaciu stránku (vrátane
// novej správy "prezeranie webu je len pre registrovaných", čo sa zobrazuje
// po presmerovaní z uzamknutého webu) — nech je táto, pre nových návštevníkov
// najdôležitejšia stránka, plne preložená hneď, nie až po ručnom doplnení.
const SEED: Record<string, { en: string; cs: string }> = {
  'auth.prihlasit': { en: 'Log in', cs: 'Přihlásit se' },
  'auth.prezyvka': { en: 'Nickname', cs: 'Přezdívka' },
  'auth.heslo': { en: 'Password', cs: 'Heslo' },
  'auth.nemas_ucet': { en: "Don't have an account?", cs: 'Nemáš účet?' },
  'auth.zaregistrovat': { en: 'Sign up', cs: 'Zaregistrovat se' },
  'auth.chyba_zablokovany': { en: 'This account has been banned by an administrator.', cs: 'Tento účet byl zablokován administrátorem.' },
  'auth.chyba_zamknuty': {
    en: 'Too many incorrect login attempts. The account is temporarily locked — try again in 15 minutes.',
    cs: 'Příliš mnoho nesprávných pokusů o přihlášení. Účet je dočasně uzamčen — zkus to znovu za 15 minut.'
  },
  'auth.chyba_nespravne_udaje': { en: 'Incorrect nickname or password.', cs: 'Nesprávná přezdívka nebo heslo.' },
  'auth.iba_pre_registrovanych': { en: 'Browsing this site is only available to registered users.', cs: 'Prohlížení webu je určeno pouze pro registrované uživatele.' },
  'auth.prihlas_sa_alebo': { en: 'Log in, or', cs: 'Přihlas se, nebo si' },
  'auth.vytvor_ucet_odkaz': { en: 'create an account', cs: 'vytvoř účet' },
  'auth.rychle_a_zadarmo': { en: '— it only takes a moment and is free.', cs: '— je to rychlé a zdarma.' },
  'auth.skryt_heslo': { en: 'Hide password', cs: 'Skrýt heslo' },
  'auth.zobrazit_heslo': { en: 'Show password', cs: 'Zobrazit heslo' },
  'auth.email_neovereny': {
    en: 'Your e-mail address is not verified yet. Please check your inbox (including spam) and click the link in the e-mail.',
    cs: 'Tvůj e-mail ještě není ověřen. Zkontroluj si prosím schránku (i spam) a klikni na odkaz z e-mailu.'
  },
  'auth.email_znova_odoslany': { en: 'The verification e-mail has been sent again.', cs: 'Ověřovací e-mail byl znovu odeslán.' },
  'auth.poslat_znova': { en: 'Resend verification e-mail', cs: 'Poslat ověřovací e-mail znovu' },
  'auth.odosielam_email': { en: 'Sending…', cs: 'Odesílám…' },
  'auth.prihlasujem': { en: 'Logging in…', cs: 'Přihlašuji…' }
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
      // Neprepisujeme, ak už admin niečo vlastné doplnil — dopĺňame len
      // to, čo ešte chýba (prázdne EN/CS pole).
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
