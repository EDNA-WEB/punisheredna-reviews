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
export async function deleteImageByUrl(url: string | null | undefined): Promise<void> {
  if (!url || !url.includes('res.cloudinary.com')) return;
  try {
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return;
    // odstráni prípadnú verzovaciu časť "v1234567890/" na začiatku a príponu súboru na konci
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const publicId = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // upratovacia operácia — chyba sa zámerne ignoruje
  }
}
