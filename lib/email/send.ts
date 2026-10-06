// ---------------------------------------------------------------------------
// Odosielanie e-mailov cez Resend (https://resend.com) — priamym volaním API,
// bez závislosti na npm balíčku. Kľúč: premenná prostredia RESEND_API_KEY.
// Odosielateľ: KrálFilmu <noreply@kralfilmu.cz> (doména overená v Resende).
// ---------------------------------------------------------------------------

export const EMAIL_FROM = process.env.EMAIL_FROM || 'KrálFilmu <noreply@kralfilmu.cz>';
const API = 'https://api.resend.com';

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  // Odkaz na odhlásenie odberu — doplní hlavičky List-Unsubscribe (Gmail,
  // Outlook a ďalší potom zobrazia vlastné tlačidlo „Odhlásit“).
  unsubscribeUrl?: string;
};

function toPayload(e: OutgoingEmail) {
  const headers: Record<string, string> = {};
  if (e.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${e.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  return {
    from: EMAIL_FROM,
    to: [e.to],
    subject: e.subject,
    html: e.html,
    ...(e.text ? { text: e.text } : {}),
    ...(Object.keys(headers).length ? { headers } : {})
  };
}

function key() {
  const k = process.env.RESEND_API_KEY;
  if (!k) console.error('[email] RESEND_API_KEY nie je nastavený — e-mail sa neodoslal.');
  return k;
}

// Jeden e-mail. Vráti true pri úspechu (chyba sa len zaloguje, nikdy nevyhodí).
export async function sendOne(email: OutgoingEmail): Promise<boolean> {
  const k = key();
  if (!k) return false;
  try {
    const res = await fetch(`${API}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(email))
    });
    if (!res.ok) console.error('[email] Resend odmietol e-mail:', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (error) {
    console.error('[email] Odoslanie zlyhalo:', error);
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Viac e-mailov naraz (hromadné API Resendu, po 100 v jednej požiadavke).
// Vráti počet úspešne odovzdaných e-mailov.
export async function sendMany(emails: OutgoingEmail[]): Promise<number> {
  const k = key();
  if (!k || !emails.length) return 0;
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    try {
      const res = await fetch(`${API}/emails/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map(toPayload))
      });
      if (res.ok) sent += chunk.length;
      else console.error('[email] Resend odmietol dávku:', res.status, (await res.text()).slice(0, 300));
    } catch (error) {
      console.error('[email] Odoslanie dávky zlyhalo:', error);
    }
    if (i + 100 < emails.length) await sleep(700); // limit Resendu na počet požiadaviek za sekundu
  }
  return sent;
}
