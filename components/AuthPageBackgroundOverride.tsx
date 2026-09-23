'use client';

import { useEffect } from 'react';

// Zdieľaný kontajner stránok (".main-content-shell" v layout.tsx) má vlastné
// NEPRIEHĽADNÉ pozadie ("bg-bg"), čo je na väčšine webu správne, ale úplne by
// prekrylo tapetu webu (SiteWallpaper) za Steam-štýl kartou prihlásenia a
// registrácie. Namiesto veľkej prestavby zdieľaného layoutu len na týchto
// dvoch stránkach dočasne vypneme farbu pozadia priamo v prehliadači — a pri
// odchode zo stránky ju vrátime späť, nech to neovplyvní zvyšok webu.
export default function AuthPageBackgroundOverride() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.main-content-shell');
    if (!shell) return;
    const previous = shell.style.backgroundColor;
    shell.style.backgroundColor = 'transparent';
    return () => {
      shell.style.backgroundColor = previous;
    };
  }, []);

  return null;
}
