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
    en: 'Scan the code with your phone where you are already logged in, and confirm the login there — no password needed.',
    cs: 'Naskenujte kód telefonem, kde jste již přihlášeni, a potvrďte tam přihlášení — bez zadávání hesla.'
  },
  'auth.vytvorte_si_ucet': { en: 'Create an account', cs: 'Vytvořte si účet' },
  'auth.zopakujte_heslo': { en: 'Confirm password', cs: 'Zopakujte heslo' },

  'auth.qr_vyprsal': { en: 'The QR code has expired.', cs: 'Platnost QR kódu vypršela.' },
  'auth.qr_novy_kod': { en: 'Load a new code', cs: 'Načíst nový kód' },
  'auth.qr_potvrdenie_zlyhalo': { en: 'Confirmation failed.', cs: 'Potvrzení selhalo.' },
  'auth.qr_hotovo': { en: 'Done — the other device will now log in.', cs: 'Hotovo — druhé zařízení se nyní přihlásí.' },
  'auth.qr_potvrdzujem': { en: 'Confirming…', cs: 'Potvrzuji…' },
  'auth.qr_potvrdit_prihlasenie': { en: 'Confirm login', cs: 'Potvrdit přihlášení' },
  'auth.qr_uz_neplati': { en: 'This QR code is no longer valid', cs: 'Tento QR kód už neplatí' },
  'auth.qr_vrat_sa': {
    en: 'Go back to the login page on your other device and scan a new code.',
    cs: 'Vraťte se na přihlašovací stránku na druhém zařízení a naskenujte nový kód.'
  },
  'auth.qr_prihlasit_v_druhom': { en: 'Log in on your other device?', cs: 'Přihlásit se na druhém zařízení?' },
  'auth.qr_potvrdis_pred': { en: 'You will confirm login to the account', cs: 'Potvrdíte přihlášení k účtu' },
  'auth.qr_potvrdis_po': { en: 'on the device that scanned this code.', cs: 'na zařízení, které naskenovalo tento kód.' },

  'auth.captcha_nacitavam': { en: 'Loading…', cs: 'Načítám…' },
  'auth.captcha_chyba': { en: 'Failed to load', cs: 'Nepodařilo se načíst' },
  'auth.registracie_pozastavene': {
    en: 'Registrations are currently paused. Please try again later. If you already have an account, you can',
    cs: 'Registrace jsou momentálně pozastaveny. Zkus to prosím později. Pokud už účet máš, můžeš se'
  },
  'auth.prihlasit_odkaz': { en: 'log in', cs: 'přihlásit' },
  'auth.prezyvka_pomocny_text': { en: "You'll log in using this nickname — not your e-mail.", cs: 'Touto přezdívkou se budeš přihlašovat — ne e-mailem.' },
  'auth.prihlas_sa_odkaz': { en: 'Log in', cs: 'Přihlas se' }
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
