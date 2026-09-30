export type PrivacyCategory = {
  key: string;
  title: string;
  description: string;
  mandatory: boolean;
};

export const DEFAULT_PRIVACY_TEXT =
  'Na této stránce zpracováváme údaje potřebné k jejímu provozu a k tomu, abychom ti mohli nabídnout lepší zážitek. Níže si můžeš nastavit, s čím souhlasíš.';

export const DEFAULT_PRIVACY_CATEGORIES: PrivacyCategory[] = [
  {
    key: 'necessary',
    title: 'Nevyhnutné technické súbory',
    description: 'Přihlášení, bezpečnost účtu a základní provoz webu. Bez tohoto web nemůže fungovat.',
    mandatory: true
  },
  {
    key: 'preferences',
    title: 'Uloženie preferencií',
    description: 'Zapamatování jazyka, vzhledu (světlý/tmavý režim) a časového pásma. Pokud toto vypneš, tvoje volby se nebudou ukládat na další návštěvu.',
    mandatory: false
  },
  {
    key: 'analytics',
    title: 'Štatistika návštevnosti',
    description: 'Anonymní měření návštěvnosti stránek, které nám pomáhá web vylepšovat.',
    mandatory: false
  },
  {
    key: 'personalization',
    title: 'Personalizovaný obsah',
    description: 'Doporučení filmů a recenzí na základě tvé aktivity na webu (např. sekce "Recenze oblíbených"). Pokud toto vypneš, tyto sekce se ti přestanou zobrazovat.',
    mandatory: false
  }
];

// Prečíta súhlas uložený v cookie "privacy_consent" (JSON objekt podľa kľúča kategórie).
// Ak používateľ ešte nikdy neotvoril okno súhlasu, cookie neexistuje — v tom prípade sa
// správame ako doteraz (všetko povolené), nič sa nemá čo náhle vypnúť bez jeho vedomia.
export function parseConsentCookie(raw: string | undefined | null): Record<string, boolean> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function isConsentGranted(consent: Record<string, boolean> | null, key: string): boolean {
  if (!consent) return true; // súhlas sa ešte nerozhodoval -> pôvodné (predvolené) správanie
  if (!(key in consent)) return true;
  return consent[key] !== false;
}

export const DEFAULT_COOKIES_TEXT = `ZÁSADY COOKIES\n\nTyto zásady cookies popisují, jak webová stránka KrálFilmu.cz získává a zpracovává informace o návštěvnících pomocí souborů cookies.\n\nCO JSOU COOKIES?\n\nPojmem cookies se rozumí soubory cookies a další podobné technologie (například pixelové značky, webové signály nebo identifikátory zařízení), které mohou automaticky shromažďovat údaje při návštěvě webové stránky.\n\nCookies jsou obsahově malé soubory ve vašem internetovém prohlížeči, které slouží k ukládání a přijímání identifikátorů a dalších informací o zařízeních, ze kterých na webovou stránku přistupujete, a pomáhají nám tak poskytovat, chránit a zlepšovat nabízené služby.\n\nÚČEL COOKIES\n\nPoužívání cookies nám umožňuje nabídnout vám ty funkce, které nejlépe odpovídají vašim potřebám. Cookies umožňují zaznamenat informace o vaší návštěvě, díky čemuž je vaše další návštěva jednodušší a rychlejší.\n\nSoubory cookies zejména:\n\nslouží k efektivní navigaci na stránce, k personalizaci, ukládání předvoleb a celkově ke zlepšení uživatelského prostředí stránky.\numožňují rozlišit, zda konkrétní uživatel už v minulosti stránku navštívil, nebo zda je novým návštěvníkem.\n\nDRUHY COOKIES\n\nPodle toho, kdo cookies vytváří, je dělíme do dvou kategorií:\n\nCookie první strany vytváří přímo tato webová stránka. Slouží hlavně k zajištění základní funkčnosti stránky.\nCookie třetích stran jsou vytvářeny jinými weby či službami (například vloženými videi).\n\nCookies lze také rozdělit podle jejich trvanlivosti na:\n\nRelační cookies (session cookies) jsou dočasné. Ukládají se do vašeho zařízení jen do doby, než ukončíte práci s internetovým prohlížečem, a po jeho zavření se vymažou. Jsou nezbytné pro řádnou funkčnost stránky.\nPermanentní cookies zůstávají ve vašem prohlížeči po delší dobu nebo dokud je ručně neodstraníte.\n\nPodle účelu použití na stránce dělíme cookies na:\n\nNezbytné cookies, které jsou potřebné pro provoz webové stránky. Zahrnují například cookies, které vám umožňují přihlásit se do zabezpečených částí stránky.\nFunkční cookies používáme ke zlepšení fungování stránky — pomáhají nám anonymně sledovat, jak návštěvníci stránku používají, a díky tomu ji můžeme postupně vylepšovat.\n\nPOUŽÍVANÉ COOKIES\n\nWebová stránka využívá tyto cookies:\n\nnext-auth.session-token — Technická cookie nutná pro přihlášení a udržení relace\ntheme — Technická cookie pro uložení volby světlého/tmavého vzhledu\nprivacy_consent — Technická cookie pro uložení tvých voleb z okna "Nastavení soukromí"\n\nODMÍTNUTÍ COOKIES\n\nSoubory cookies si můžeš nastavit prostřednictvím okna "Nastavení soukromí", které je trvale umístěné v patičce hlavní stránky. Svou volbu můžeš kdykoli změnit.\n\nSoubory cookies můžeš také úplně odmítnout v nastavení svého internetového prohlížeče, případně si nastavit používání jen některých. Pokud však vypneš všechny cookies (včetně nezbytných), nemusí se ti podařit získat přístup na stránku nebo do některých jejích částí.\n\nNastavení cookies v nejčastěji používaných prohlížečích najdeš na těchto stránkách:\n\nChrome - https://support.google.com/accounts/answer/61416\nFirefox - https://support.mozilla.org/cs/kb/vymazani-cookies\nSafari - https://support.apple.com/cs-cz/HT201265\nOpera - https://www.opera.com/help/tutorials/security/privacy/\n\nK dispozici je také mnoho aplikací třetích stran, které umožňují blokovat nebo spravovat cookies. Cookies uložené ve svém zařízení můžeš také vymazat vymazáním historie prohlížení.\n\nODKAZY\n\nDalší užitečné informace o souborech cookies můžeš najít na těchto stránkách:\n\nwww.aboutcookies.org\nwww.allaboutcookies.org\nwww.youronlinechoices.eu\n\nKONTAKTNÍ ÚDAJE\n\nPokud máš otázky týkající se cookies nebo zpracování údajů, napiš nám prostřednictvím zprávy administrátorovi KrálFilmu přímo na webu.\n\nProvozovatel webové stránky KrálFilmu.cz je oprávněn tyto Zásady cookies kdykoli jednostranně měnit nebo doplňovat.`;
