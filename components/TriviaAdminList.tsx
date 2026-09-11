'use client';

import { useState } from 'react';
import BulkImportRunner from './BulkImportRunner';
import ClientPagination from './ClientPagination';

type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  _count: { trivia: number };
};

export default function TriviaAdminList({ initialMovies }: { initialMovies: MovieItem[] }) {
  const [movies] = useState(initialMovies);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = query.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    : movies;

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Stiahnuť zoznam filmov bez zaujímavosti</div>
        <div className="text-xs text-muted mb-3">
          Vygeneruje textový súbor so všetkými filmami, čo nemajú ani jednu zaujímavosť a majú priradený ČSFD odkaz, v
          tvare "Názov (Rok) – ČSFD odkaz".
        </div>
        <a
          href="/api/admin/movies/export-missing-trivia"
          className="inline-block border border-line text-ink text-sm font-semibold px-5 py-2.5 rounded-full hover:border-accent hover:text-accent"
        >
          Stiahnuť zoznam (.txt)
        </a>
      </div>

      <BulkImportRunner
        endpoint="/api/admin/movies/bulk-import-trivia"
        title="Hromadne pridať zaujímavosti"
        description={'Vlož zoznam v tvare "Názov filmu – Zaujímavosť 1; Zaujímavosť 2", jeden riadok na film. Jednotlivé zaujímavosti oddeľuj bodkočiarkou (nie čiarkou, tá sa môže vyskytnúť priamo vo vete). Pozor: pri filme, čo sa v zozname objaví, sa jeho PÔVODNÉ zaujímavosti úplne nahradia týmito novými (nezlučujú sa).'}
        placeholder={'Kmotr – Film sa natáčal v New Yorku a na Sicílii.; Marlon Brando za rolu dostal Oscara, ktorý odmietol prevziať.'}
        buttonLabel="Pridať zaujímavosti"
      />

      <input
        className="field-input-sm max-w-sm mb-4"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Hľadať film/seriál…"
      />

      <div className="border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line">
          {paged.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <div
                className="w-9 h-12 rounded bg-surface bg-cover bg-center flex-none"
                style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate flex items-center gap-1.5">
                  {m._count.trivia === 0 && <span className="w-2 h-2 rounded-full bg-danger flex-none" title="Bez zaujímavostí" />}
                  {m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}
                </div>
                <div className="text-xs text-muted">
                  {m._count.trivia > 0 ? `${m._count.trivia} zaujímavostí` : 'Zatiaľ žiadne zaujímavosti'}
                </div>
              </div>
              <a href={`/admin/movies/${m.id}/edit`} className="text-xs font-semibold text-accent hover:underline flex-none">
                Upraviť vo filme
              </a>
            </div>
          ))}
          {paged.length === 0 && <p className="text-sm text-muted p-4">Žiadny film/seriál sa nenašiel.</p>}
        </div>
      </div>
      <div className="mt-4">
        <ClientPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
