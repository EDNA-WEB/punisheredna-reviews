// V databáze má zmazaný používateľ meno v tvare "Zmazaný používateľ AB12CD"
// (prípona je nutná kvôli jedinečnosti mena). Návštevníkom sa má zobrazovať
// len preložená fráza bez prípony.
export function displayUserName(name: string, t: (key: string) => string): string {
  if (name.startsWith('Zmazaný používateľ ')) {
    return t('user.zmazany_pouzivatel');
  }
  return name;
}
