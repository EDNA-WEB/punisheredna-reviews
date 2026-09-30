import { NextResponse } from 'next/server';
import { requireMobileAdmin } from '@/lib/adminAuth';
import { getDashboardData, getAdminBadges } from '@/lib/adminDashboard';

export const dynamic = 'force-dynamic';

// Natívna administrácia v appke — dashboard (rovnaké dáta ako web, cache 2 min).
export async function GET(req: Request) {
  const user = await requireMobileAdmin(req, true);
  if (!user) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  if (user.role !== 'ADMIN') return NextResponse.json({ editorOnly: true });
  const [data, badges] = await Promise.all([getDashboardData(), getAdminBadges()]);
  return NextResponse.json({ ...data, badges });
}
