// Filter na "je to už naozaj zverejnené" — nesmie to byť koncept, a buď nemá
// naplánovaný čas vôbec (staré/okamžité novinky), alebo naplánovaný čas už nastal.
export function publishedNewsFilter() {
  return { isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] };
}
