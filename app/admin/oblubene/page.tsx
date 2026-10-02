import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

// Prehľad sekcie „Oblíbené mezi fanoušky“: aktuálne poradie od bota a tituly,
// ktoré v databáze chýbajú (na hlavnej stránke sa nezobrazujú).
export default async function AdminFanFavoritesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  let rows: { rank: number; title: string; year: number | null; updatedAt: Date; tmdbId: number | null; importError: string | null; movie: { title: string; slug: string } | null }[] = [];
  let missingTable = false;
  try {
    rows = await prisma.fanFavorite.findMany({
      orderBy: { rank: 'asc' },
      select: { rank: true, title: true, year: true, updatedAt: true, tmdbId: true, importError: true, movie: { select: { title: true, slug: true } } }
    });
  } catch {
    missingTable = true;
  }
  const missing = rows.filter((r) => !r.movie);
  const updated = rows[0]?.updatedAt;

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Oblíbené mezi fanoušky</>} compact />
      <p className="text-sm text-muted mb-6">
        {missingTable
          ? 'Tabulka zatím neexistuje — spusť SQL z návodu.'
          : updated
            ? `Poslední aktualizace: ${updated.toLocaleString('cs-CZ')} · ${rows.length} titulů, z toho ${missing.length} chybí v databázi.`
            : 'Bot zatím neposlal žádná data. Spusť ho ručně v GitHub → Actions → Oblibene mezi fanousky → Run workflow.'}
      </p>

      {missing.length > 0 && (
        <div className="border border-line rounded-xl bg-card p-4 mb-6">
          <h2 className="font-semibold text-ink mb-2">Chybí v databázi ({missing.length})</h2>
          <p className="text-xs text-muted mb-3">Chybějící tituly bot přidává automaticky z TMDb. Zde zůstávají jen ty, které se přidat nepodařilo nebo se ještě přidávají.</p>
          <ul className="text-sm space-y-1">
            {missing.map((r) => (
              <li key={r.rank} className="text-ink">
                {r.rank}. {r.title} {r.year ? <span className="text-muted">({r.year})</span> : null}
                <span className="text-xs text-muted">
                  {' — '}
                  {!r.tmdbId ? 'nenalezeno na TMDb' : r.importError ? `import selhal: ${r.importError}` : 'čeká na přidání'}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/movies/hromadny-import" className="inline-block mt-3 text-sm font-semibold text-accent hover:underline">
            Přidat přes import z TMDb
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden bg-card">
          {rows.map((r) => (
            <div key={r.rank} className="flex items-center gap-4 px-4 py-2.5 text-sm">
              <span className="w-8 text-muted tabular-nums">{r.rank}.</span>
              <span className="flex-1 min-w-0 truncate text-ink">
                {r.title} {r.year ? <span className="text-muted">({r.year})</span> : null}
              </span>
              {r.movie ? (
                <Link href={`/movie/${r.movie.slug}`} className="text-accent hover:underline truncate max-w-[40%]">{r.movie.title}</Link>
              ) : (
                <span className="text-muted">{r.importError ? 'import selhal' : r.tmdbId ? 'přidává se' : 'nenalezeno'}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
