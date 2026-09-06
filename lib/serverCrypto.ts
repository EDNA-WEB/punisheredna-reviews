import crypto from 'crypto';

// Šifrovanie na strane servera — spoľahlivá alternatíva k šifrovaniu viazanému
// na prehliadač (to sa v praxi ukázalo krehké: rôzne zariadenia, čistenie
// úložiska prehliadača, pretekanie pri generovaní kľúčov). Server má JEDEN
// pevný kľúč (v premennej prostredia MESSAGE_ENCRYPTION_KEY) a šifruje/dešifruje
// spoľahlivo, bez závislosti na tom, aké zariadenie/prehliadač používateľ práve
// používa. Text správ je v databáze uložený zašifrovaný (AES-256-GCM) — ak by
// niekto získal priamy prístup k databáze, uvidí len nezmyselné znaky.
//
// Rozdiel oproti predošlému pokusu o end-to-end šifrovanie: server (a teda aj
// admin, ak by mal dôvod) technicky VIE obsah dešifrovať, keďže kľúč pozná.
// Výmenou za to je toto riešenie spoľahlivé a nezávislé od zariadenia.

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('Chýba MESSAGE_ENCRYPTION_KEY v premenných prostredia.');
  }
  // Odvodíme z toho, čo je v premennej prostredia, presne 32 bajtov (256 bitov)
  // potrebných pre AES-256 — nezáleží na tom, akú presnú dĺžku textu tam admin zadá.
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptMessageBody(plaintext: string): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Uložíme zašifrovaný text spolu s overovacou značkou (auth tag) — obe sú
  // potrebné na správne dešifrovanie a overenie, že text nebol pozmenený.
  return { ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'), iv: iv.toString('base64') };
}

export function decryptMessageBody(ciphertext: string, iv: string): string {
  const data = Buffer.from(ciphertext, 'base64');
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
