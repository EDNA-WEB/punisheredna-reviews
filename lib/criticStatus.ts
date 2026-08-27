import { prisma } from './prisma';

export const VERIFIED_CRITIC_THRESHOLD = 2000;

// Vráti množinu ID používateľov, ktorí majú odznak "Overený kritik" —
// buď sú administrátori, alebo dosiahli 2000+ recenzií a 2000+ hodnotení.
export async function getVerifiedCriticIds(): Promise<Set<string>> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      _count: { select: { reviews: true, ratings: true } }
    }
  });

  const ids = users
    .filter(
      (u) =>
        u.role === 'ADMIN' ||
        (u._count.reviews >= VERIFIED_CRITIC_THRESHOLD && u._count.ratings >= VERIFIED_CRITIC_THRESHOLD)
    )
    .map((u) => u.id);

  return new Set(ids);
}
