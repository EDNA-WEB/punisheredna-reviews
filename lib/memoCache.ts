// Jednoduchá pamäť v rámci jednej bežiacej inštancie servera (Vercel funkcie
// bežia opakovane v tej istej "teplej" inštancii). Opakované požiadavky počas
// platnosti sa vybavia bez databázy. Nie je zdieľaná medzi inštanciami — na
// to slúži unstable_cache / CDN; toto je lacná prvá vrstva pred nimi.
type Entry = { at: number; ttl: number; value: any };
const g = globalThis as unknown as { __memoCache?: Map<string, Entry> };
const store: Map<string, Entry> = g.__memoCache || (g.__memoCache = new Map());

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T;
  const value = await fn();
  store.set(key, { at: Date.now(), ttl: ttlMs, value });
  if (store.size > 2000) store.clear(); // poistka proti rastu pamäte
  return value;
}

export function memoForget(prefix: string) {
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

// Hlavička pre CDN Vercelu: odpoveď sa podrží v sieti Vercelu a ďalšie
// požiadavky ju dostanú bez spustenia funkcie aj bez databázy.
// stale-while-revalidate = počas obnovy sa ešte vydáva stará verzia.
export function cdnHeaders(seconds: number) {
  return { 'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}` };
}
