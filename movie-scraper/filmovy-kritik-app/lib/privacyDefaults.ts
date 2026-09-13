export type PrivacyCategory = {
  key: string;
  title: string;
  description: string;
  mandatory: boolean;
};

export const DEFAULT_PRIVACY_TEXT =
  'Na tejto stránke spracúvame údaje potrebné na jej prevádzku a na to, aby sme ti vedeli ponúknuť lepší zážitok. Nižšie si môžeš nastaviť, s čím súhlasíš.';

export const DEFAULT_PRIVACY_CATEGORIES: PrivacyCategory[] = [
  {
    key: 'necessary',
    title: 'Nevyhnutné technické súbory',
    description: 'Prihlásenie, bezpečnosť účtu a základná prevádzka webu. Bez tohto web nemôže fungovať.',
    mandatory: true
  },
  {
    key: 'preferences',
    title: 'Uloženie preferencií',
    description: 'Zapamätanie jazyka, vzhľadu (svetlý/tmavý režim) a časového pásma. Ak toto vypneš, tvoje voľby sa nebudú ukladať na ďalšiu návštevu.',
    mandatory: false
  },
  {
    key: 'analytics',
    title: 'Štatistika návštevnosti',
    description: 'Anonymné meranie návštevnosti stránok, ktoré nám pomáha web vylepšovať.',
    mandatory: false
  },
  {
    key: 'personalization',
    title: 'Personalizovaný obsah',
    description: 'Odporúčania filmov a recenzií na základe tvojej aktivity na webe (napr. sekcia "Recenzie obľúbených"). Ak toto vypneš, tieto sekcie sa ti prestanú zobrazovať.',
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

export const DEFAULT_COOKIES_TEXT = `ZÁSADY COOKIES

Tieto zásady cookies popisujú, ako webová stránka PunisherEDNA reviews získava a spracúva informácie o návštevníkoch pomocou súborov cookies.

CO SÚ COOKIES?

Pojmom cookies sa myslia súbory cookies a ďalšie podobné technológie (napríklad pixelové značky, webové signály alebo identifikátory zariadení), ktoré môžu automaticky zhromažďovať údaje pri návšteve webovej stránky.

Cookies sú obsahovo malé súbory vo vašom internetovom prehliadači, ktoré slúžia na ukladanie a prijímanie identifikátorov a ďalších informácií o zariadeniach, z ktorých pristupujete na webovú stránku, a pomáhajú nám tak poskytovať, chrániť a zlepšovať ponúkané služby.

ÚČEL COOKIES

Používanie cookies nám umožňuje ponúknuť vám tie funkcie, ktoré najlepšie zodpovedajú vašim potrebám. Cookies umožňujú zaznamenať informácie o vašej návšteve, vďaka čomu je vaša ďalšia návšteva jednoduchšia a rýchlejšia.

Súbory cookies najmä:

slúžia k efektívnej navigácii na stránke, k personalizácii, ukladaniu predvolieb a celkovo k vylepšeniu používateľského prostredia stránky.
umožňujú rozlíšiť, či konkrétny používateľ už v minulosti navštívil stránku, alebo či je novým návštevníkom.

DRUHY COOKIES

Podľa toho, kto cookies vytvára, ich delíme na dve kategórie:

Cookie prvej strany vytvára priamo táto webová stránka. Slúžia najmä na zaistenie základnej funkčnosti stránky.
Cookie tretích strán sú vytvárané inými webmi či službami (napríklad vloženými videami).

Cookies možno tiež rozdeliť podľa ich trvanlivosti na:

Relačné cookies (session cookies) sú dočasné. Ukladajú sa do vášho zariadenia len do doby, než ukončíte prácu s internetovým prehliadačom, a po jeho zatvorení sa vymažú. Sú nevyhnutné pre riadnu funkčnosť stránky.
Permanentné cookies zostávajú vo vašom prehliadači po dlhšie obdobie alebo dokým ich ručne neodstránite.

Podľa účelu použitia na stránke delíme cookies na:

Nezbytné cookies, ktoré sú potrebné na prevádzku webovej stránky. Zahŕňajú napríklad cookies, ktoré vám umožňujú prihlásiť sa do zabezpečených častí stránky.
Funkčné cookies používame na zlepšenie fungovania stránky — pomáhajú nám anonymne sledovať, ako návštevníci stránku používajú, a vďaka tomu ju vieme postupne vylepšovať.

POUŽÍVANÉ COOKIES

Webová stránka využíva tieto cookies:

next-auth.session-token — Technická cookie nutná pre prihlásenie a udržanie relácie
theme — Technická cookie na uloženie voľby svetlého/tmavého vzhľadu
privacy_consent — Technická cookie na uloženie tvojich volieb z okna "Nastavenie súkromia"

ODMIETNUTIE COOKIES

Súbory cookies si môžeš nastaviť prostredníctvom okna "Nastavenie súkromia", ktoré je trvalo umiestnené v pätičke hlavnej stránky. Svoju voľbu môžeš kedykoľvek zmeniť.

Súbory cookies môžeš tiež úplne odmietnuť v nastaveniach svojho internetového prehliadača, prípadne si nastaviť používanie len niektorých. Ak však vypneš všetky cookies (vrátane nevyhnutných), nemusí sa ti podariť získať prístup na stránku alebo do niektorých jej častí.

Nastavenie cookies v najčastejšie používaných prehliadačoch nájdeš na týchto stránkach:

Chrome - https://support.google.com/accounts/answer/61416
Firefox - https://support.mozilla.org/sk/kb/vymazanie-cookies
Safari - https://support.apple.com/sk-sk/HT201265
Opera - https://www.opera.com/help/tutorials/security/privacy/

K dispozícii je tiež mnoho aplikácií tretích strán, ktoré umožňujú blokovať alebo spravovať cookies. Cookies uložené vo svojom zariadení môžeš tiež vymazať vymazaním histórie prehliadania.

ODKAZY

Ďalšie užitočné informácie o súboroch cookies môžeš nájsť na týchto stránkach:

www.aboutcookies.org
www.allaboutcookies.org
www.youronlinechoices.eu

KONTAKTNÉ ÚDAJE

Ak máš otázky týkajúce sa cookies alebo spracovania údajov, napíš nám prostredníctvom správy administrátorovi PunisherEDNA priamo na webe.

Prevádzkovateľ webovej stránky PunisherEDNA reviews je oprávnený tieto Zásady cookies kedykoľvek jednostranne meniť alebo dopĺňať.`;
