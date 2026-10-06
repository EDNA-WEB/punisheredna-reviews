import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActivityRows } from '@/lib/security/report';
import { RETENTION_DAYS } from '@/lib/security/activityLog';
import PrintButton from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

// Výpis IP záznamov pre úradnú žiadosť — s celými IP adresami. Otvorí sa len
// cez zapísanú žiadosť (LegalRequest), takže každé zobrazenie má evidenciu.
const fmt = (iso: string, tz: string) =>
  new Date(iso).toLocaleString('cs-CZ', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default async function IpReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');
  const { id } = await params;
  const request = await prisma.legalRequest.findUnique({ where: { id } });
  if (!request) notFound();
  let scope: { userId: string; from: string; to: string };
  try {
    scope = JSON.parse(request.scope);
  } catch {
    notFound();
  }
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: scope.userId }, select: { id: true, name: true, email: true, createdAt: true } }),
    loadActivityRows(scope.userId, new Date(scope.from), new Date(scope.to), { fullIp: true })
  ]);

  const th = 'text-left px-2 py-1.5 border border-gray-300 bg-gray-100 font-semibold';
  const td = 'px-2 py-1.5 border border-gray-300 align-top';

  return (
    <div className="admin-page">
      <style>{`@media print { body * { visibility: hidden !important; } #ip-report, #ip-report * { visibility: visible !important; } #ip-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; } }`}</style>
      <div className="flex flex-wrap items-center gap-3 mb-5 print:hidden">
        <Link href="/admin/bezpecnost" className="text-sm text-accent font-semibold hover:underline">
          ← Zpět na Bezpečnost
        </Link>
        <span className="flex-1" />
        <PrintButton />
      </div>

      <div id="ip-report" className="bg-white text-black rounded-xl p-8 text-[13px] leading-relaxed">
        <h1 className="text-xl font-bold mb-1">Výpis záznamů o činnosti uživatele</h1>
        <p className="text-gray-600 mb-5">KrálFilmu.cz · vygenerováno {fmt(new Date().toISOString(), 'Europe/Prague')} (SEČ/SELČ)</p>

        <table className="w-full border-collapse mb-6">
          <tbody>
            <tr><td className={th}>Orgán, který žádost podal</td><td className={td}>{request.authority}</td></tr>
            <tr><td className={th}>Číslo jednací žádosti</td><td className={td}>{request.referenceNo}</td></tr>
            <tr><td className={th}>Právní základ</td><td className={td}>{request.legalBasis}</td></tr>
            <tr><td className={th}>Vyřizuje</td><td className={td}>{request.handledBy}</td></tr>
            <tr><td className={th}>Uživatel (přezdívka)</td><td className={td}>{user?.name || scope.userId}</td></tr>
            <tr><td className={th}>E-mail účtu</td><td className={td}>{user?.email || '—'}</td></tr>
            <tr><td className={th}>Účet vytvořen</td><td className={td}>{user ? fmt(user.createdAt.toISOString(), 'Europe/Prague') : '—'}</td></tr>
            <tr><td className={th}>Období</td><td className={td}>{fmt(scope.from, 'UTC')} – {fmt(scope.to, 'UTC')} (UTC)</td></tr>
            <tr><td className={th}>Počet záznamů</td><td className={td}>{rows.length}</td></tr>
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p>V zadaném období nejsou o uživateli uloženy žádné záznamy. Záznamy se uchovávají {Math.round(RETENTION_DAYS / 30)} měsíců.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Čas (UTC)</th>
                <th className={th}>Čas (Praha)</th>
                <th className={th}>Činnost</th>
                <th className={th}>IP adresa</th>
                <th className={th}>Zařízení (User-Agent)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{fmt(r.createdAt, 'UTC')}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmt(r.createdAt, 'Europe/Prague')}</td>
                  <td className={td}>{r.label}</td>
                  <td className={`${td} whitespace-nowrap font-mono`}>{r.ip}</td>
                  <td className={`${td} break-all text-[11px] text-gray-700`}>{r.userAgent || r.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-gray-600 mt-6 text-[12px]">
          IP adresa je adresa, ze které požadavek přišel na server webu. Zdrojový port provozovatel nemá k dispozici.
          Časy jsou uvedeny s přesností na sekundy.
        </p>
        <div className="mt-12 flex justify-between text-[12px]">
          <div>Datum a podpis: ______________________</div>
          <div>Provozovatel KrálFilmu.cz</div>
        </div>
      </div>
    </div>
  );
}
