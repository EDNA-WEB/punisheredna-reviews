import { prisma } from './prisma';

// Zaznamená poslednú aktivitu používateľa. Vždy sa drží iba jeden, najnovší
// záznam na používateľa — nová aktivita prepíše tú predchádzajúcu.
export async function logActivity(userId: string, label: string, link: string) {
  try {
    await prisma.userActivity.upsert({
      where: { userId },
      update: { label, link, createdAt: new Date() },
      create: { userId, label, link }
    });
  } catch {
    // aktivita je len informatívna, nikdy nesmie zhodiť stránku
  }
}
