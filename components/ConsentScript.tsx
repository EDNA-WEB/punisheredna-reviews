'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { parseConsentCookie } from '@/lib/privacyDefaults';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

// Prísne (opt-in) vyhodnotenie súhlasu — na rozdiel od isConsentGranted() v
// lib/privacyDefaults.ts (ktorá defaultne POVOĽUJE, kým sa používateľ nevyjadrí,
// vhodné pre mäkké preferencie) TÁTO funkcia analytický/marketingový skript
// nikdy nepustí, kým používateľ výslovne a aktívne nesúhlasí.
function isStrictlyGranted(key: string): boolean {
  const consent = parseConsentCookie(readCookie('privacy_consent'));
  return consent?.[key] === true;
}

// Obalí akýkoľvek analytický/marketingový skript (Google Analytics, Meta Pixel,
// TikTok Pixel a pod.). Skript sa do stránky vôbec nevloží, kým návštevník
// výslovne neudelí súhlas s danou kategóriou (predvolene VŽDY zablokované) —
// a keď ho udelí, skript sa načíta okamžite, bez nutnosti obnoviť stránku.
//
// Použitie napr. pre Google Analytics:
//   <ConsentScript category="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX" />
export default function ConsentScript({
  category,
  src,
  id,
  strategy = 'afterInteractive',
  children
}: {
  category: string;
  src?: string;
  id?: string;
  strategy?: 'afterInteractive' | 'lazyOnload';
  children?: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(isStrictlyGranted(category));
    function onUpdate() {
      setAllowed(isStrictlyGranted(category));
    }
    window.addEventListener('privacy-consent-updated', onUpdate);
    return () => window.removeEventListener('privacy-consent-updated', onUpdate);
  }, [category]);

  if (!allowed) return null;

  if (src) {
    return <Script id={id} src={src} strategy={strategy} />;
  }
  return (
    <Script id={id} strategy={strategy}>
      {children as any}
    </Script>
  );
}
