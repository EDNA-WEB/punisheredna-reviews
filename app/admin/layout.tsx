import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAdminBadges } from '@/lib/adminDashboard';
import AdminShell from '@/components/admin/AdminShell';
import './admin.css';

export const dynamic = 'force-dynamic';

// Spoločné rozhranie celej administrácie (bočný panel + horná lišta).
// Prístup: admin (všetko) a redaktor (len novinky) — každá stránka si to
// navyše overuje sama; cudzí dostanú 404 už v proxy.ts.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const isEditor = !!(session?.user as any)?.isEditor;
  if (!session || (role !== 'ADMIN' && !isEditor)) notFound();

  const userId = (session.user as any).id as string;
  const [user, badges] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } }),
    role === 'ADMIN' ? getAdminBadges() : Promise.resolve({} as Record<string, number>)
  ]);

  // Otvorené z mobilnej appky → bez bočného panela a hornej lišty (appka má vlastnú hlavičku)
  const embed = (await headers()).get('x-app-embed') === '1';

  return (
    <AdminShell embed={embed} userName={user?.name || 'Admin'} userAvatar={user?.avatar || null} isAdmin={role === 'ADMIN'} badges={badges}>
      {children}
    </AdminShell>
  );
}
