// Filter na "je to už naozaj zverejnené" — nesmie to byť koncept, a buď nemá
// naplánovaný čas vôbec (staré/okamžité novinky), alebo naplánovaný čas už nastal.
export function publishedNewsFilter() {
  return { isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] };
}

// Rovnaký princíp, ale s prihliadnutím na členstvo — Golden Ticket členovia
// vidia novinku hneď po zverejnení, ostatní registrovaní až o 10 hodín
// neskôr. "Efektívny čas zverejnenia" je publishAt (ak je nastavený),
// inak createdAt (okamžité zverejnenie bez naplánovania).
export function publishedNewsFilterForMember(isMember: boolean) {
  const cutoff = isMember ? new Date() : new Date(Date.now() - 10 * 60 * 60 * 1000);
  return {
    isDraft: false,
    OR: [{ publishAt: { lte: cutoff } }, { AND: [{ publishAt: null }, { createdAt: { lte: cutoff } }] }]
  };
}

// Rovnaký princíp, ale pre novo pridané filmy/seriály — Golden Ticket členovia
// vidia nový titul v katalógu hneď, ostatní registrovaní až o 2 hodiny neskôr.
export function movieVisibleFilter(isMember: boolean) {
  if (isMember) return {};
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return { createdAt: { lte: cutoff } };
}
