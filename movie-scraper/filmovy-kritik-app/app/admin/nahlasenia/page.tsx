import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';
import ReportReviewButton from '@/components/ReportReviewButton';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const reports = await prisma.messageReport.findMany({
    orderBy: [{ reviewed: 'asc' }, { createdAt: 'desc' }],
    include: {
      reporter: { select: { id: true, name: true } },
      reportedUser: { select: { id: true, name: true } }
    }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Nahlásenia z Pošty</h1>

      {reports.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ žiadne nahlásenia.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className={`border rounded-xl p-4 ${r.reviewed ? 'border-line bg-card' : 'border-danger/40 bg-danger/5'}`}>
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="text-sm">
                  <Link href={`/profile/${r.reporter.id}`} className="font-semibold text-accent hover:underline">{r.reporter.name}</Link>
                  <span className="text-muted"> nahlásil/-a </span>
                  <Link href={`/profile/${r.reportedUser.id}`} className="font-semibold text-accent hover:underline">{r.reportedUser.name}</Link>
                </div>
                <div className="flex items-center gap-3 flex-none">
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}</span>
                  <ReportReviewButton reportId={r.id} initialReviewed={r.reviewed} />
                </div>
              </div>
              <pre className="text-xs text-ink bg-surface rounded-lg p-3 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">{r.transcript}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
