import { prisma } from '@/lib/prisma';

// Vždy vráti dvojicu ID v rovnakom (stabilnom) poradí, nech pre dvoch tých
// istých ľudí vždy vznikne len jeden riadok v Conversation, bez ohľadu na to,
// kto písal ako prvý.
export function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(userId: string, otherId: string, initiatorId: string) {
  const [userAId, userBId] = sortedPair(userId, otherId);
  const existing = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (existing) return existing;
  return prisma.conversation.create({ data: { userAId, userBId, initiatorId, status: 'PENDING' } });
}
