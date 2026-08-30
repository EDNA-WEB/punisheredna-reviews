import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import ContentSubmissionsAdmin from '@/components/ContentSubmissionsAdmin';

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
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Návrhy obsahu</h1>
      <p className="text-sm text-muted mb-6">
        Návrhy obsahu filmov/seriálov od používateľov, čakajúce na schválenie. Po schválení sa text uloží ako "Obsah" daného filmu.
      </p>
      <ContentSubmissionsAdmin initialSubmissions={submissions} />
    </div>
  );
}
