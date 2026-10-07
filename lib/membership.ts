import { randomInt } from 'crypto';
import { prisma } from './prisma';
import { memo } from './memoCache';
import { getOrCreateSystemAccount } from './recoveryCode';

// Zdieľaná funkcia na overenie, či má používateľ aktívne (zaplatené) členstvo
// — používa sa všade, kde je nejaká funkcia dostupná len pre platiacich
// (Box Office, časová os v profile osoby, úprava/mazanie vlastných príspevkov,
// vytváranie zoznamov, skoré zobrazenie noviniek). Zohľadňuje aj prepínač
// "onlineFreeForAll" v nastaveniach (dočasné sprístupnenie všetkým).
export async function isActiveMember(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  // Výkon: volá sa pri každom zobrazení stránky (layout) — výsledok platí 60 s.
  const until = await memo(`member:${userId}`, 60_000, async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { membershipUntil: true } });
    return user?.membershipUntil ? user.membershipUntil.toISOString() : null;
  });
  return !!(until && new Date(until) > new Date());
}

// Vynechané zámerne mätúce znaky (0/O, 1/I/L) — rovnaký princíp ako pri
// bezpečnostných kódoch, aby sa kód dal ľahko odpísať/prepísať bez omylu.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;

export type MembershipType = 'trial4d' | 'month' | 'year';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CHARS[randomInt(CHARS.length)];
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    const existing = await prisma.membershipCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Nepodařilo se vygenerovat jedinečný kód členství.');
}

function durationForType(type: MembershipType): number {
  // v milisekundách
  if (type === 'trial4d') return 4 * 24 * 60 * 60 * 1000;
  if (type === 'month') return 30 * 24 * 60 * 60 * 1000;
  return 365 * 24 * 60 * 60 * 1000;
}

function labelForType(type: MembershipType): string {
  if (type === 'trial4d') return '4-dňová skúšobná verzia';
  if (type === 'month') return 'mesačné';
  return 'ročné';
}

// Vytvorí 4-dňový skúšobný kód VIAZANÝ na konkrétneho nového používateľa
// (nedá sa uplatniť pod iným účtom) a hneď mu ho pošle do Pošty zo Systémového
// účtu. Volá sa automaticky pri registrácii.
export async function issueTrialCode(userId: string) {
  const code = await generateUniqueCode();
  await prisma.membershipCode.create({
    data: { code, type: 'trial4d', forUserId: userId }
  });

  const system = await getOrCreateSystemAccount();
  await prisma.message.create({
    data: {
      senderId: system.id,
      receiverId: userId,
      body: `Vítej na KrálFilmu.cz! Tady je tvůj kód na 4denní zkušební verzi Golden Ticket členství: ${code}\n\nUplatnit ho můžeš v nastavení profilu, v sekci "Členství".`
    }
  });
}

// Admin vygeneruje mesačný/ročný kód. Ak zadá cieľového používateľa, kód sa mu
// rovno pošle do Pošty (typicky po tom, čo admin ručne overí prijatú platbu).
export async function generatePaidCode(type: 'month' | 'year', adminId: string, targetUserId?: string) {
  const code = await generateUniqueCode();
  await prisma.membershipCode.create({
    data: { code, type, createdByAdminId: adminId }
  });

  if (targetUserId) {
    const system = await getOrCreateSystemAccount();
    await prisma.message.create({
      data: {
        senderId: system.id,
        receiverId: targetUserId,
        body: `Děkujeme za tvou platbu! Tady je tvůj kód na ${labelForType(type)} Golden Ticket členstvo: ${code}\n\nUplatnit ho můžeš v nastavení profilu, v sekci "Členství".`
      }
    });
  }

  return code;
}

// Uplatní kód pre daného používateľa. Vráti buď { ok: true, until } alebo
// { ok: false, error } — nikdy nehádže výnimku, aby sa dala priamo posunúť do API odpovede.
export async function redeemMembershipCode(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) {
    return { ok: false as const, error: `Kód musí mít přesně ${CODE_LENGTH} znakov.` };
  }

  const record = await prisma.membershipCode.findUnique({ where: { code } });
  if (!record) return { ok: false as const, error: 'Tento kód neexistuje.' };
  if (record.usedByUserId) return { ok: false as const, error: 'Tento kód už byl uplatněn.' };
  if (record.type === 'trial4d' && record.forUserId !== userId) {
    return { ok: false as const, error: 'Tento zkušební kód patří jinému účtu.' };
  }
  if (record.type === 'trial4d') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { redeemedTrial: true } });
    if (user?.redeemedTrial) {
      return { ok: false as const, error: 'Skúšobnú verziu si už niekedy využil.' };
    }
  }

  // Bezpečnosť: všetko v jednej transakcii a atómovo — kód sa označí ako
  // použitý len vtedy, ak ešte NIKTO iný nebol rýchlejší (usedByUserId: null).
  // Dva súbežné pokusy s tým istým kódom tak už nepredĺžia členstvo dvakrát.
  const type = record.type as MembershipType;
  let until: Date;
  try {
    until = await prisma.$transaction(async (tx) => {
      const claimed = await tx.membershipCode.updateMany({
        where: { id: record.id, usedByUserId: null },
        data: { usedByUserId: userId, usedAt: new Date() }
      });
      if (claimed.count !== 1) throw new Error('CODE_USED');
      if (type === 'trial4d') {
        const t = await tx.user.updateMany({ where: { id: userId, redeemedTrial: false }, data: { redeemedTrial: true } });
        if (t.count !== 1) throw new Error('TRIAL_USED');
      }
      // Riadok používateľa zamkneme, nech dva rôzne kódy naraz nepočítajú z rovnakého základu.
      const rows = await tx.$queryRaw<{ membershipUntil: Date | null }[]>`
        SELECT "membershipUntil" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const current = rows[0]?.membershipUntil ? new Date(rows[0].membershipUntil) : null;
      const base = current && current > new Date() ? current : new Date();
      const next = new Date(base.getTime() + durationForType(type));
      await tx.user.update({ where: { id: userId }, data: { membershipUntil: next } });
      return next;
    });
  } catch (err: any) {
    if (err?.message === 'CODE_USED') return { ok: false as const, error: 'Tento kód už byl uplatněn.' };
    if (err?.message === 'TRIAL_USED') return { ok: false as const, error: 'Skúšobnú verziu si už niekedy využil.' };
    throw err;
  }

  return { ok: true as const, until, type: record.type as MembershipType, label: labelForType(record.type as MembershipType) };
}
