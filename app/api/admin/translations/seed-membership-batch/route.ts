import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

// Jednorazové doplnenie EN/CS prekladov pre kľúče pridané spolu s funkciami
// členstva, nahlásení online odkazov, poradia v Box Office a súťaže o HBO.
// Spustí sa raz ručne z administrácie, nič sa neprepíše, ak už preklad existuje.
const SEED: Record<string, { en: string; cs: string }> = {
  'membership.kupit_clenstvo': { en: 'Buy membership', cs: 'Koupit členství' },
  'membership.golden_ticket': { en: 'Golden Ticket membership', cs: 'Golden Ticket členství' },
  'membership.aktivne_do': { en: 'Your membership is active until', cs: 'Tvé členství je aktivní do' },
  'membership.nemas_aktivne': { en: "You don't currently have an active Golden Ticket membership.", cs: 'Momentálně nemáš aktivní Golden Ticket členství.' },
  'membership.info_text': { en: "Membership is set manually after payment is received — if you've already paid and it's not showing here yet, please let us know.", cs: 'Členství se nastavuje ručně po přijetí platby — pokud jsi již zaplatil a členství se zde ještě nezobrazuje, dej nám prosím vědět.' },
  'membership.este_dni': { en: 'membership active for', cs: 'členství aktivní ještě' },
  'membership.dni': { en: 'days', cs: 'dní' },

  'report_online.tlacidlo': { en: 'Report a missing movie or broken link', cs: 'Nahlásit chybějící film nebo nefunkční odkaz' },
  'report_online.co_je_zle': { en: "What's wrong exactly? (optional)", cs: 'Co přesně je špatně? (volitelné)' },
  'report_online.placeholder': { en: "E.g. the link doesn't work, the movie isn't added at all…", cs: 'Např. odkaz nefunguje, film vůbec není přidán…' },
  'report_online.odoslat': { en: 'Send report', cs: 'Odeslat nahlášení' },
  'report_online.odosielam': { en: 'Sending…', cs: 'Odesílám…' },
  'report_online.zrusit': { en: 'Cancel', cs: 'Zrušit' },
  'report_online.dakujeme': { en: "Thank you, we've received your report.", cs: 'Děkujeme, nahlášení jsme přijali.' },

  'boxoffice.najziskovejsi': { en: 'most profitable', cs: 'nejziskovější' },
  'boxoffice.najvacsi_prepadak_odznak': { en: 'biggest flop', cs: 'největší propadák' },
  'boxoffice.z_celkovo': { en: 'of', cs: 'z' },
  'boxoffice.trzby_aktualne': { en: 'Highest revenue (current dollar value)', cs: 'Nejvyšší tržby (aktuální hodnota $)' },
  'boxoffice.trzby_inflacia': { en: "Highest revenue (adjusted to today's money)", cs: 'Nejvyšší tržby (přepočítané na dnešní hodnotu peněz)' },
  'boxoffice.najvacsie_zarobky': { en: 'Biggest earners (highest studio profit)', cs: 'Největší výdělky (nejvyšší zisk studia)' },
  'boxoffice.najvacsie_prepadaky': { en: 'Biggest flops (largest studio loss)', cs: 'Největší propadáky (největší ztráta studia)' },

  'sutaz.hbo_nadpis': { en: 'Contest: win a year of HBO subscription', cs: 'Soutěž o roční předplatné HBO' },
  'sutaz.co_vyhrat': { en: 'What you can win', cs: 'Co můžeš vyhrát' },
  'sutaz.co_vyhrat_text': { en: 'The prize is an account with an active subscription for a full year.', cs: 'Soutěží se o účet, na kterém je aktivováno předplatné na celý jeden rok.' },
  'sutaz.ako_sa_zapojit': { en: 'How to enter', cs: 'Jak se zapojit' },
  'sutaz.podmienky_uvod': { en: 'Any registered user can enter who:', cs: 'Do soutěže se může zapojit každý registrovaný uživatel, který:' },
  'sutaz.podmienka_clenstvo': { en: 'has an active membership worth at least €2,', cs: 'má aktivované členství v hodnotě alespoň 2 €,' },
  'sutaz.podmienka_registracia': { en: 'is registered on the site,', cs: 'je registrovaný na webu,' },
  'sutaz.podmienka_recenzie': { en: 'has posted at least 30 reviews and ratings.', cs: 'přidal alespoň 30 recenzí a hodnocení.' },
  'sutaz.termin': { en: 'Contest deadline', cs: 'Termín soutěže' },
  'sutaz.termin_text': { en: 'The exact end date of the contest will be announced soon.', cs: 'Přesný termín ukončení soutěže bude ještě upřesněn.' }
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
        data: { key, group: registryEntry?.group || 'Ostatné', sk: registryEntry?.sk || key, en, cs }
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, total: Object.keys(SEED).length });
}
