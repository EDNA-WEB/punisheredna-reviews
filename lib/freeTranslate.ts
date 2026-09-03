// Bezplatný preklad krátkych textov cez MyMemory API — bez registrácie, bez API kľúča.
// Má rozumný denný limit (cca 5000 slov na IP adresu/deň), čo na pár tagov na film stačí.
// Keďže ide o bezplatnú službu tretej strany, môže byť občas pomalšia alebo nedostupná —
// v takom prípade sa jednoducho vráti pôvodný (anglický) text, nič sa nerozbije.
export async function freeTranslate(text: string, targetLang: string = 'cs'): Promise<string> {
  if (!text.trim()) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    return translated && typeof translated === 'string' ? translated : text;
  } catch {
    return text;
  }
}

export async function freeTranslateMany(texts: string[], targetLang: string = 'cs'): Promise<string[]> {
  const results: string[] = [];
  for (const t of texts) {
    results.push(await freeTranslate(t, targetLang));
  }
  return results;
}
