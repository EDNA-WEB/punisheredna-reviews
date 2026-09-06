'use client';

// Skutočné end-to-end šifrovanie správ, postavené na natívnom Web Crypto API
// prehliadača (žiadna externá knižnica). Súkromný kľúč nikdy neopustí zariadenie
// používateľa — server (a teda ani databáza) ho nikdy nevidí.
//
// Princíp: ECDH (P-256) na dohodnutie zdieľaného tajomstva medzi dvoma ľuďmi,
// z ktorého sa odvodí AES-GCM kľúč na samotné šifrovanie/dešifrovanie textu.
// Obaja účastníci odvodia PRESNE ten istý kľúč nezávisle od seba, bez toho, aby
// sa kedy preniesol po sieti.

const PRIVATE_KEY_STORAGE_KEY = 'e2ee_private_key_jwk';

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
}

// Viacero komponent na tej istej stránke (zoznam správ, formulár, konverzácia)
// môže túto funkciu zavolať prakticky naraz, hneď pri prvom otvorení Pošty. Bez
// poistky by si mohli navzájom "podraziť nohy" — každá by si myslela, že kľúč
// ešte neexistuje, vygenerovala by si vlastný, a na server by sa nahral iný
// kľúč, než aký si nakoniec v prehliadači ponechala posledná z nich. Uložením
// PREBIEHAJÚCEHO sľubu (nie len výsledku) zaručíme, že sa vygeneruje/nahrá len
// JEDEN kľúč, bez ohľadu na to, koľko komponent o to súčasne požiada.
let inFlightKeyPromise: Promise<CryptoKey> | null = null;

// Zabezpečí, že toto zariadenie má súkromný kľúč — ak nie, vygeneruje nový pár
// a verejný kľúč nahrá na server (súkromný ostáva len v localStorage).
export async function ensureMyKeyPair(): Promise<CryptoKey> {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (stored) {
    const jwk = JSON.parse(stored);
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  }

  if (inFlightKeyPromise) return inFlightKeyPromise;

  inFlightKeyPromise = (async () => {
    try {
      // Ešte raz overíme localStorage — kým sme čakali na svoj rad, mohla ho
      // medzitým vytvoriť iná (skoršia) požiadavka.
      const stillStored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
      if (stillStored) {
        const jwk = JSON.parse(stillStored);
        return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
      }

      const pair = await generateKeyPair();
      const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
      const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(privateJwk));

      // Nahratie na server MUSÍ prejsť úspešne — inak by lokálny kľúč a ten na
      // serveri boli navzájom nekonzistentné (presne toto spôsobovalo pôvodnú
      // chybu). Pri zlyhaní kľúč z localStorage radšej vymažeme a vyhodíme
      // chybu, nech to volajúci vie a skúsi znova, než aby ostal v tichom,
      // nekonzistentnom stave.
      const res = await fetch('/api/users/me/public-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: JSON.stringify(publicJwk) })
      });
      if (!res.ok) {
        localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
        throw new Error('Nepodarilo sa nahrať šifrovací kľúč na server.');
      }

      return pair.privateKey;
    } finally {
      inFlightKeyPromise = null;
    }
  })();

  return inFlightKeyPromise;
}

export function hasLocalKey(): boolean {
  return !!localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
}

// Núdzová obnova pre zariadenie, čo sa dostalo do nekonzistentného stavu
// (lokálny kľúč nesedí s tým na serveri) — zahodí starý kľúč a vygeneruje
// úplne nový. Staršie správy, čo si druhá strana zašifrovala starým kľúčom,
// sa už nedajú dešifrovať (to je vlastnosť E2E šifrovania), ale nové správy
// od tohto bodu už budú fungovať správne.
export function resetMyKeyPair() {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
}

async function importPeerPublicKey(publicKeyJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(publicKeyJson);
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

// Obaja účastníci volaním tejto funkcie (každý so svojím súkromným + tým druhým
// verejným kľúčom) dostanú identický AES kľúč, bez prenosu po sieti.
export async function deriveSharedKey(myPrivateKey: CryptoKey, peerPublicKeyJson: string): Promise<CryptoKey> {
  const peerPublicKey = await importPeerPublicKey(peerPublicKeyJson);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

export async function encryptText(sharedKey: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);
  return { ciphertext: bufToBase64(encrypted), iv: bufToBase64(iv.buffer) };
}

export async function decryptText(sharedKey: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuf(iv)) },
    sharedKey,
    base64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}
