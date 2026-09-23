// Tento súbor obsahuje LEN úpravu textu URL adresy (žiadne volanie na
// Cloudinary API, žiadne tajné kľúče) — bezpečné použiť aj v klientskom
// ('use client') kóde v prehliadači, na rozdiel od lib/cloudinary.ts, čo
// importuje serverový Cloudinary SDK.

export function cloudinaryThumbnailUrlClient(url: string, width = 300): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto/`);
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
  const transformation = `l_text:Arial_27_bold:${encoded},co_white,g_south_east,x_15,y_14,b_rgb:000000a5,co_rgb:FFFFFF,r_5`;
  return url.replace('/upload/', `/upload/${transformation}/`);
}
