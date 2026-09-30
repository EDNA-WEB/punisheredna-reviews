import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDashboardData } from '@/lib/adminDashboard';
import AdminIcon from '@/components/admin/AdminIcon';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Dashboard administrácie: kľúčové čísla s trendom, grafy za 14 dní, fronta
// vecí na vybavenie a posledná aktivita. Dáta sú cachované 2 minúty.
// ---------------------------------------------------------------------------

const fmt = (n: number) => new Intl.NumberFormat('cs-CZ').format(n);

function Trend({ now, prev }: { now: number; prev: number }) {
  if (now === 0 && prev === 0) return <span className="text-[12px] text-muted">bez změny</span>;
  const diff = prev === 0 ? 100 : Math.round(((now - prev) / prev) * 100);
  const up = now >= prev;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <AdminIcon name={up ? 'arrowUp' : 'arrowDown'} className="w-3.5 h-3.5" />
      {Math.abs(diff)} %
    </span>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const w = 120, h = 36;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[120px] h-9" aria-hidden>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.1" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({ label, total, now, prev, icon, series, color, href }: { label: string; total: number; now: number; prev: number; icon: string; series?: number[]; color: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-card p-5 hover:shadow-md hover:border-accent/40 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1a`, color }}>
          <AdminIcon name={icon} className="w-[18px] h-[18px]" />
        </span>
      </div>
      <div className="mt-3 font-display font-extrabold text-[28px] leading-none text-ink tabular-nums">{fmt(total)}</div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[12px] text-muted leading-snug">
          <span className="font-semibold text-ink">+{fmt(now)}</span> za 7 dní
          <div className="mt-0.5">
            <Trend now={now} prev={prev} /> <span className="text-muted">vs. předchozí týden</span>
          </div>
        </div>
        {series && <Sparkline values={series} color={color} />}
      </div>
    </Link>
  );
}

function BarChart({ series }: { series: { day: string; users: number; reviews: number; ratings: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.ratings + s.reviews + s.users));
  const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return (
    <div>
      <div className="flex items-end gap-1.5 h-44">
        {series.map((s) => {
          const total = s.users + s.reviews + s.ratings;
          return (
            <div key={s.day} className="flex-1 flex flex-col justify-end h-full group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-ink text-bg text-[11px] px-2 py-1 z-10">
                {s.ratings} hodn. · {s.reviews} rec. · {s.users} reg.
              </div>
              <div className="w-full flex flex-col-reverse rounded-md overflow-hidden" style={{ height: `${Math.max(2, (total / max) * 100)}%` }}>
                <div style={{ flex: s.ratings || 0.0001, background: '#6366f1' }} />
                <div style={{ flex: s.reviews || 0.0001, background: '#f59e0b' }} />
                <div style={{ flex: s.users || 0.0001, background: '#10b981' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        {series.map((s) => {
          const d = new Date(s.day + 'T12:00:00');
          return (
            <div key={s.day} className="flex-1 text-center text-[10.5px] text-muted leading-tight">
              <div>{days[d.getDay()]}</div>
              <div className="tabular-nums">{d.getDate()}.</div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 mt-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366f1' }} /> Hodnocení</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f59e0b' }} /> Recenze</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#10b981' }} /> Registrace</span>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'právě teď';
  if (m < 60) return `před ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'včera' : `před ${d} dny`;
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    <img src={src} alt="" className="w-8 h-8 rounded-full object-cover bg-surface flex-none" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold text-xs flex items-center justify-center flex-none">{name.slice(0, 1).toUpperCase()}</div>
  );
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session) redirect('/login');
  if (role !== 'ADMIN') redirect('/admin/news'); // redaktor má prístup len k novinkám

  const d = await getDashboardData();
  const name = (session.user as any)?.name || '';
  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer';
  const today = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const queue = [
    { label: 'Filmy čekající na schválení', count: d.queue.pendingMovies, href: '/admin/movies', icon: 'film' },
    { label: 'Osobnosti čekající na schválení', count: d.queue.pendingPeople, href: '/admin/people', icon: 'user' },
    { label: 'Návrhy obsahu od uživatelů', count: d.queue.pendingSubmissions, href: '/admin/navrhy-obsahu', icon: 'inbox' },
    { label: 'Nahlášené nefunkční online odkazy', count: d.queue.onlineReports, href: '/admin/online', icon: 'tv' },
    { label: 'Nahlášené chaty (7 dní)', count: d.queue.chatReports, href: '/admin/nahlasenia', icon: 'flag' }
  ];
  const openItems = queue.reduce((s, q) => s + q.count, 0);

  return (
    <div className="pt-6 sm:pt-8">
      {/* Hlavička */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[13px] text-muted first-letter:uppercase">{today}</div>
          <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] text-ink leading-tight">
            {greeting}, {name}
          </h1>
          <p className="text-[14px] text-muted mt-1">
            {openItems > 0 ? `Na vyřízení čeká ${openItems} ${openItems === 1 ? 'položka' : openItems < 5 ? 'položky' : 'položek'}.` : 'Vše je vyřízeno — skvělá práce.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/movies/new" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-accent text-white text-[13.5px] font-semibold hover:bg-accent-dark shadow-sm">
            <AdminIcon name="plus" className="w-4 h-4" /> Přidat film
          </Link>
          <Link href="/admin/news/new" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-line bg-card text-ink text-[13.5px] font-semibold hover:border-accent/50">
            <AdminIcon name="news" className="w-4 h-4" /> Napsat novinku
          </Link>
          <Link href="/admin/movies/hromadny-import" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-line bg-card text-ink text-[13.5px] font-semibold hover:border-accent/50">
            <AdminIcon name="stream" className="w-4 h-4" /> Import z TMDb
          </Link>
        </div>
      </div>

      {/* Kľúčové čísla */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Uživatelé" total={d.kpi.users.total} now={d.kpi.users.new7} prev={d.kpi.users.prev7} icon="users" color="#10b981" series={d.series.map((s) => s.users)} href="/admin/users" />
        <KpiCard label="Filmy a seriály" total={d.kpi.movies.total} now={d.kpi.movies.new7} prev={d.kpi.movies.prev7} icon="film" color="#0ea5e9" href="/admin/movies" />
        <KpiCard label="Recenze" total={d.kpi.reviews.total} now={d.kpi.reviews.new7} prev={d.kpi.reviews.prev7} icon="star" color="#f59e0b" series={d.series.map((s) => s.reviews)} href="/admin/reviews" />
        <KpiCard label="Hodnocení" total={d.kpi.ratings.total} now={d.kpi.ratings.new7} prev={d.kpi.ratings.prev7} icon="chart" color="#6366f1" series={d.series.map((s) => s.ratings)} href="/admin/analytics" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* Graf aktivity */}
        <section className="lg:col-span-2 rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-[15px] text-ink">Aktivita komunity</h2>
              <p className="text-[12.5px] text-muted">Posledních 14 dní</p>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <div className="text-[11px] text-muted">Aktivní dnes</div>
                <div className="font-display font-bold text-lg text-ink tabular-nums">{fmt(d.kpi.activeToday)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">Golden Ticket</div>
                <div className="font-display font-bold text-lg text-ink tabular-nums">{fmt(d.kpi.members)}</div>
              </div>
            </div>
          </div>
          <BarChart series={d.series} />
        </section>

        {/* Fronta na vybavenie */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-semibold text-[15px] text-ink">Na vyřízení</h2>
          <p className="text-[12.5px] text-muted mb-3">Co čeká na tvou reakci</p>
          <ul className="divide-y divide-line">
            {queue.map((q) => (
              <li key={q.href}>
                <Link href={q.href} className="flex items-center gap-3 py-3 group">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${q.count > 0 ? 'bg-accent/10 text-accent' : 'bg-surface text-muted'}`}>
                    <AdminIcon name={q.icon} className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-[13.5px] text-ink group-hover:text-accent">{q.label}</span>
                  <span className={`min-w-[28px] h-6 px-2 rounded-full text-[12px] font-bold flex items-center justify-center tabular-nums ${q.count > 0 ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>
                    {q.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* Posledné recenzie */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[15px] text-ink">Nejnovější recenze</h2>
            <Link href="/admin/reviews" className="text-[12.5px] font-semibold text-accent hover:underline">Všechny →</Link>
          </div>
          {d.recentReviews.length === 0 ? (
            <p className="text-[13px] text-muted py-6 text-center">Zatím žádné recenze.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recentReviews.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-12 rounded-md bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/movie/${r.movie.slug}`} className="block text-[13.5px] font-semibold text-ink truncate hover:text-accent">{r.movie.title}</Link>
                    <div className="text-[12px] text-muted truncate">
                      <Link href={`/profile/${r.author.id}`} className="hover:text-ink">{r.author.name}</Link> · {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <Link href={`/admin/reviews/${r.id}`} className="text-[12px] font-semibold text-muted hover:text-accent px-2 py-1 rounded-md hover:bg-surface">Upravit</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Noví používatelia */}
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[15px] text-ink">Noví uživatelé</h2>
            <Link href="/admin/users" className="text-[12.5px] font-semibold text-accent hover:underline">Všichni →</Link>
          </div>
          <ul className="divide-y divide-line">
            {d.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={u.name} src={u.avatar} />
                <Link href={`/profile/${u.id}`} className="flex-1 min-w-0 text-[13.5px] font-semibold text-ink truncate hover:text-accent">{u.name}</Link>
                <span className="text-[12px] text-muted flex items-center gap-1"><AdminIcon name="clock" className="w-3.5 h-3.5" />{timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-[11.5px] text-muted mt-6">Údaje se obnovují každé 2 minuty · naposledy {new Date(d.generatedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
}
