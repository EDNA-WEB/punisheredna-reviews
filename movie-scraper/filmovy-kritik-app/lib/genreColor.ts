const PALETTE: { bg: string; text: string }[] = [
  { bg: '#FDE8E8', text: '#B42318' }, // červená
  { bg: '#FEF0C7', text: '#B54708' }, // jantárová
  { bg: '#D1FADF', text: '#05603A' }, // zelená
  { bg: '#D1E9FF', text: '#175CD3' }, // modrá
  { bg: '#E9D7FE', text: '#6941C6' }, // fialová
  { bg: '#FCE7F6', text: '#C11574' }, // ružová
  { bg: '#D0F5F1', text: '#0E7C7B' }, // tyrkysová
  { bg: '#FFE6D5', text: '#B93815' }  // oranžová
];

export function genreColor(genre: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
