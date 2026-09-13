import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Vynechané zámerne mätúce znaky (0/O, 1/I/L) — rovnaký princíp ako pri CAPTCHA.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SYSTEM_ACCOUNT_EMAIL = 'system@internal.punisheredna';
const SYSTEM_ACCOUNT_NAME = 'Systém';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

// Vygeneruje kód, ktorý ešte nikto v systéme nemá — každý kód je naozaj jedinečný.
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    const existing = await prisma.user.findUnique({ where: { recoveryCode: code } });
    if (!existing) return code;
  }
  throw new Error('Nepodarilo sa vygenerovať jedinečný bezpečnostný kód.');
}

// Samostatný, technický účet "Systém" — nie je to osobný účet administrátora.
// Bezpečnostné kódy sa odosielajú z NEHO, nie z účtu PunisherEDNA, práve preto,
// aby administrátor nemal cez svoju vlastnú schránku prístup k cudzím kódom.
// Heslo tohto účtu je náhodné a nikde sa nezobrazuje — nedá sa ním prihlásiť.
export async function getOrCreateSystemAccount() {
  let system = await prisma.user.findUnique({ where: { email: SYSTEM_ACCOUNT_EMAIL } });
  if (system) return system;

  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  system = await prisma.user.create({
    data: {
      name: SYSTEM_ACCOUNT_NAME,
      email: SYSTEM_ACCOUNT_EMAIL,
      passwordHash,
      role: 'READER'
    }
  });
  return system;
}

// Vygeneruje nový bezpečnostný kód pre používateľa (starý tým prestane platiť)
// a pošle mu ho do schránky — ako správu od technického účtu "Systém".
export async function issueRecoveryCode(userId: string): Promise<void> {
  const code = await generateUniqueCode();
  await prisma.user.update({ where: { id: userId }, data: { recoveryCode: code } });

  const system = await getOrCreateSystemAccount();
  if (system.id === userId) return;

  await prisma.message.create({
    data: {
      senderId: system.id,
      receiverId: userId,
      body:
        `Tvoj bezpečnostný kód na obnovenie hesla je: ${code}\n\n` +
        `Tento kód si ulož na bezpečné miesto. Ak niekedy zabudneš heslo, klikni na "Zabudnuté heslo" na prihlasovacej stránke a tento kód tam zadaj — umožní ti to nastaviť si nové heslo.\n\n` +
        `Po každej zmene hesla (aj cez tento kód) ti príde nový kód a tento súčasný prestane platiť.\n\n` +
        `Túto správu odoslal automatický systém webu — administrátor k tvojmu kódu nemá prístup.`
    }
  });
}
