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
    const previousBg = shell.style.backgroundColor;
    const previousImage = shell.style.backgroundImage;

    // Namiesto plochej, rovnomerne priehľadnej farby (to pôsobilo fádne a
    // "zamazane" bez ohľadu na percento) použijeme PLYNULÝ PRECHOD: úplne
    // solídne pri hornej lište a pri pätičke (žiadny ostrý švík), a citeľne
    // priehľadnejšie presne v STREDE — tam, kde sedí prihlasovacia karta —
    // nech tapeta vystúpi práve tam, kde má najväčší efekt.
    const computed = getComputedStyle(shell).backgroundColor;
    const rgbMatch = computed.match(/\d+(\.\d+)?/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const [r, g, b] = rgbMatch;
      shell.style.backgroundColor = 'transparent';
      shell.style.backgroundImage = `linear-gradient(to bottom,
        rgba(${r}, ${g}, ${b}, 1) 0%,
        rgba(${r}, ${g}, ${b}, 0.35) 30%,
        rgba(${r}, ${g}, ${b}, 0.35) 70%,
        rgba(${r}, ${g}, ${b}, 1) 100%)`;
    } else {
      shell.style.backgroundColor = 'transparent';
    }

    return () => {
      shell.style.backgroundColor = previousBg;
      shell.style.backgroundImage = previousImage;
    };
  }, []);

  return null;
}
