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

// Zabezpečí, že toto zariadenie má súkromný kľúč — ak nie, vygeneruje nový pár
// a verejný kľúč nahrá na server (súkromný ostáva len v localStorage).
export async function ensureMyKeyPair(): Promise<CryptoKey> {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (stored) {
    const jwk = JSON.parse(stored);
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  }

  const pair = await generateKeyPair();
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(privateJwk));

  await fetch('/api/users/me/public-key', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: JSON.stringify(publicJwk) })
  }).catch(() => {});

  return pair.privateKey;
}

export function hasLocalKey(): boolean {
  return !!localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
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
