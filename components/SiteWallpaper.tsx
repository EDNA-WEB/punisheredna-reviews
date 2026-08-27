import { prisma } from '@/lib/prisma';

export default async function SiteWallpaper() {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.wallpaper) return null;

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('${settings.wallpaper}')` }}
      aria-hidden="true"
    />
  );
}
