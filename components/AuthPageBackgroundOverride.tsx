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

    // Priehľadnosť na cca 25 % — nie úplne priehľadné (to pôsobilo nerovnomerne
    // oproti hornej lište, čo si ponecháva vlastné plné pozadie). Zistíme
    // SKUTOČNÚ farbu pozadia (rieši aj tmavý/svetlý režim a Steam tému) a len
    // znížime jej krytie, namiesto úplného vymazania farby.
    const computed = getComputedStyle(shell).backgroundColor;
    const rgbMatch = computed.match(/\d+(\.\d+)?/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const [r, g, b] = rgbMatch;
      shell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.75)`;
    } else {
      shell.style.backgroundColor = 'transparent';
    }

    return () => {
      shell.style.backgroundColor = previous;
    };
  }, []);

  return null;
}
