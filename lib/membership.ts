import { prisma } from './prisma';
import { getOrCreateSystemAccount } from './recoveryCode';

// Vynechané zámerne mätúce znaky (0/O, 1/I/L) — rovnaký princíp ako pri
// bezpečnostných kódoch, aby sa kód dal ľahko odpísať/prepísať bez omylu.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;

export type MembershipType = 'trial4d' | 'month' | 'year';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    const existing = await prisma.membershipCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Nepodarilo sa vygenerovať jedinečný kód členstva.');
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
      body: `Vitaj na PunisherEDNA reviews! Tu je tvoj kód na 4-dňovú skúšobnú verziu Golden Ticket členstva: ${code}\n\nUplatniť ho môžeš v nastaveniach profilu, v sekcii "Členstvo".`
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
        body: `Ďakujeme za tvoju platbu! Tu je tvoj kód na ${labelForType(type)} Golden Ticket členstvo: ${code}\n\nUplatniť ho môžeš v nastaveniach profilu, v sekcii "Členstvo".`
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
    return { ok: false as const, error: `Kód musí mať presne ${CODE_LENGTH} znakov.` };
  }

  const record = await prisma.membershipCode.findUnique({ where: { code } });
  if (!record) return { ok: false as const, error: 'Tento kód neexistuje.' };
  if (record.usedByUserId) return { ok: false as const, error: 'Tento kód už bol uplatnený.' };
  if (record.type === 'trial4d' && record.forUserId !== userId) {
    return { ok: false as const, error: 'Tento skúšobný kód patrí inému účtu.' };
  }
  if (record.type === 'trial4d') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { redeemedTrial: true } });
    if (user?.redeemedTrial) {
      return { ok: false as const, error: 'Skúšobnú verziu si už niekedy využil.' };
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { membershipUntil: true } });
  const base = user?.membershipUntil && user.membershipUntil > new Date() ? user.membershipUntil : new Date();
  const until = new Date(base.getTime() + durationForType(record.type as MembershipType));

  await prisma.$transaction([
    prisma.membershipCode.update({ where: { id: record.id }, data: { usedByUserId: userId, usedAt: new Date() } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        membershipUntil: until,
        ...(record.type === 'trial4d' ? { redeemedTrial: true } : {})
      }
    })
  ]);

  return { ok: true as const, until, type: record.type as MembershipType, label: labelForType(record.type as MembershipType) };
}
