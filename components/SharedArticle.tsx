// Samostatné zobrazenie zdieľaného článku — žiadne prvky webu okolo, žiadne
// odkazy, len text článku.
export default function SharedArticle({
  kicker,
  title,
  summary,
  author,
  date,
  minutes,
  cover,
  html
}: {
  kicker: string;
  title: string;
  summary: string | null;
  author: string;
  date: string;
  minutes: number;
  cover: string | null;
  html: string;
}) {
  const d = new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <main className="min-h-screen bg-bg">
      <article className="max-w-[720px] mx-auto px-5 sm:px-6 py-10 sm:py-16">
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent mb-4">{kicker}</div>
        <h1 className="font-display font-extrabold text-[30px] sm:text-[42px] leading-[1.12] text-ink mb-5">{title}</h1>
        {summary && <p className="text-lg sm:text-xl text-muted leading-relaxed mb-6">{summary}</p>}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-muted pb-6 mb-8 border-b border-line">
          <span className="font-semibold text-ink">{author}</span>
          <span aria-hidden>·</span>
          <span>{d}</span>
          <span aria-hidden>·</span>
          <span>{minutes} min čtení</span>
        </div>
        {cover && <img src={cover} alt="" className="w-full max-h-[460px] object-cover rounded-xl mb-10 bg-surface" />}
        <div className="article-body shared-article text-lg leading-[1.8] text-ink font-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <style>{`.shared-article .shared-link{color:inherit;text-decoration:none;cursor:text}`}</style>
    </main>
  );
}

// Novinka ešte nie je verejne dostupná (10 h po zverejnení) — bez odkazov.
export function SharedUnavailable() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display font-bold text-2xl text-ink mb-2">Článek zatím není dostupný</h1>
        <p className="text-muted">Zkuste prosím odkaz otevřít později.</p>
      </div>
    </main>
  );
}
