import { prisma } from './prisma';

// Zaznamená poslednú aktivitu používateľa. Vždy sa drží iba jeden, najnovší
// záznam na používateľa — nová aktivita prepíše tú predchádzajúcu.
//
// Výkon: volá sa pri každom zobrazení filmu/profilu. Keď appka alebo web
// načíta viac vecí naraz, viac zápisov do TOHO ISTÉHO riadku sa navzájom
// zablokovalo (čakanie až minúty). Preto najviac jeden zápis za minútu na
// používateľa a nikdy dva súbežne.
const g = globalThis as unknown as { __activityLast?: Map<string, number>; __activityBusy?: Set<string> };
const last: Map<string, number> = g.__activityLast || (g.__activityLast = new Map());
const busy: Set<string> = g.__activityBusy || (g.__activityBusy = new Set());

export async function logActivity(userId: string, label: string, link: string) {
  const now = Date.now();
  if (busy.has(userId) || now - (last.get(userId) || 0) < 60_000) return;
  busy.add(userId);
  last.set(userId, now);
  if (last.size > 5000) last.clear();
  try {
    await prisma.userActivity.upsert({
      where: { userId },
      update: { label, link, createdAt: new Date(now) },
      create: { userId, label, link }
    });
  } catch {
    // aktivita je len informatívna, nikdy nesmie zhodiť stránku
  } finally {
    busy.delete(userId);
  }
}
