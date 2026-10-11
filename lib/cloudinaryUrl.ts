// Tento súbor obsahuje LEN úpravu textu URL adresy (žiadne volanie na
// Cloudinary API, žiadne tajné kľúče) — bezpečné použiť aj v klientskom
// ('use client') kóde v prehliadači, na rozdiel od lib/cloudinary.ts, čo
// importuje serverový Cloudinary SDK.

export function cloudinaryThumbnailUrlClient(url: string, width = 300): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  // 2× šírka pre ostrosť na jemných displejoch, moderný formát (f_auto) a vyššia kvalita.
  return url.replace('/upload/', `/upload/f_auto,q_auto:good,w_${width * 2},c_limit/`);
}

// Pridá do už nahraného obrázka textový vodoznak so zdrojom (napr. "Zdroj:
// Prima") v pravom dolnom rohu — vloží sa transformačný parameter priamo do
// URL adresy, Cloudinary text dokreslí sama pri zobrazení, nenahráva sa
// žiadny nový súbor.
export function cloudinaryWithSourceWatermark(url: string, sourceText: string): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const trimmed = sourceText.trim();
  if (!trimmed) return url;
  const encoded = encodeURIComponent(`Zdroj: ${trimmed}`);
  const transformation = `l_text:Arial_24_bold:${encoded},co_white,g_south_east,x_14,y_13,b_rgb:00000060,co_rgb:FFFFFF,r_5`;
  return url.replace('/upload/', `/upload/${transformation}/`);
}
