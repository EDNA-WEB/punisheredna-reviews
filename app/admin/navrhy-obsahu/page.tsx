import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ContentSubmissionsAdmin from '@/components/ContentSubmissionsAdmin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminContentSubmissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const submissions = await prisma.contentSubmission.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      movie: { select: { title: true, slug: true, poster: true, year: true } },
      author: { select: { name: true, id: true } }
    }
  });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Návrhy obsahu</>} description={<>Návrhy obsahu filmů/seriálů od uživatelů, čekající na schválení. Po schválení se text uloží jako "Obsah" daného filmu.</>} />
      <ContentSubmissionsAdmin initialSubmissions={submissions} />
    </div>
  );
}
