import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Nahrá obrázok (buď dátová URL "data:image/...;base64,..." poslaná z prehliadača,
// alebo priamo verejná URL) do Cloudinary a vráti jeho trvalú, verejnú adresu.
// "folder" len prehľadne triedi obrázky v Cloudinary dashboarde podľa typu
// (napr. "movies/posters", "avatars", "gallery") — na fungovanie nie je nutný.
export async function uploadImage(dataUrlOrUrl: string, folder: string): Promise<string> {
  const result = await cloudinary.uploader.upload(dataUrlOrUrl, {
    folder: `punisheredna/${folder}`,
    resource_type: 'image'
  });
  return result.secure_url;
}

// Vygeneruje adresu MINIATÚRY z už nahraného obrázka — nenahráva sa druhý
// súbor, len sa do tej istej Cloudinary adresy vloží transformačný parameter
// (zmenšenie na šírku "width"). Cloudinary si zmenšenú verziu vygeneruje a
// uloží do medzipamäte sama, pri prvom požiadaní na túto adresu.
export function cloudinaryThumbnailUrl(url: string, width = 300): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto/`);
}
// Zmaže obrázok podľa jeho Cloudinary URL — použije sa napr. pri nahradení
// starého plagátu novým, aby v Cloudinary nezostávali nepoužité súbory navždy.
// Ticho zlyhá (nezhodí požiadavku), ak by URL nebola z Cloudinary alebo obrázok
// už neexistoval — mazanie je "upratovanie", nie kritická časť operácie.
//
// Bezpečnosť: zmaže sa LEN obrázok z nášho vlastného Cloudinary účtu a len
// z priečinka "punisheredna/…" (pri zadanom "folder" len z neho, napr.
// "avatars"). Predtým stačilo, aby URL obsahovala "res.cloudinary.com", čo
// umožnilo cez zmenu avatara zmazať ľubovoľný obrázok webu.
export function cloudinaryPublicIdFromUrl(url: string | null | undefined, folder?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (parsed.hostname !== 'res.cloudinary.com') return null;
  let parts: string[];
  try {
    parts = parsed.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
  } catch {
    return null;
  }
  // /<cloud>/image/upload/[transformácie/][v123/]punisheredna/…/nazov.jpg
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || parts[0] !== cloud || parts[1] !== 'image' || parts[2] !== 'upload') return null;
  const rest = parts.slice(3);
  const start = rest.findIndex((p) => p === 'punisheredna');
  if (start < 0) return null;
  const publicId = rest.slice(start).join('/').replace(/\.[a-zA-Z0-9]+$/, '');
  if (publicId.includes('..')) return null;
  const prefix = folder ? `punisheredna/${folder.replace(/^\/+|\/+$/g, '')}/` : 'punisheredna/';
  if (!publicId.startsWith(prefix) || publicId.length <= prefix.length) return null;
  return publicId;
}

export async function deleteImageByUrl(url: string | null | undefined, opts?: { folder?: string }): Promise<void> {
  const publicId = cloudinaryPublicIdFromUrl(url, opts?.folder);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // upratovacia operácia — chyba sa zámerne ignoruje
  }
}
