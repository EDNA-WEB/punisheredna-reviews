// Zistí "hlavný" žáner na zobrazenie na plagáte filmu — s výnimkou, že
// kombinácia Horor + Komédia sa ukazuje ako vlastný, presnejší štítok
// "Hororová komédia", namiesto zavádzajúceho označenia len ako "Horor".
export function primaryGenreLabel(genreList: string[]): string | null {
  if (genreList.includes('Horor') && genreList.includes('Komédia')) {
    return 'Hororová komédia';
  }
  return genreList[0] || null;
}
