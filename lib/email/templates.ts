import { escapeHtml as esc, siteUrl } from './util';

// ---------------------------------------------------------------------------
// Šablóny e-mailov KrálFilmu.cz — tabuľkové rozloženie s vloženými štýlmi,
// nech vyzerajú rovnako v Gmaile, Outlooku, Apple Mail aj na mobile.
// ---------------------------------------------------------------------------

const ACCENT = '#2893fe';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

type Layout = {
  preheader: string;
  body: string; // HTML obsahu karty
  cta?: { label: string; url: string };
  after?: string; // HTML pod tlačidlom
  footer: 'account' | { unsubscribeUrl: string };
};

function button(label: string, url: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 4px"><tr><td style="border-radius:10px;background:${ACCENT}">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
</td></tr></table>`;
}

function layout({ preheader, body, cta, after, footer }: Layout) {
  const site = siteUrl();
  const foot =
    footer === 'account'
      ? 'Tento e-mail je součástí správy tvého účtu.'
      : `Tento e-mail ti chodí, protože to máš zapnuté v <a href="${esc(site)}/nastavenia/notifikacie" style="color:#6b7280">Nastavení → Oznámení</a>. <a href="${esc(footer.unsubscribeUrl)}" style="color:#2a6fd6">Odhlásit odběr</a>`;
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>KrálFilmu.cz</title></head>
<body style="margin:0;padding:0;background:#f2f3f6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f3f6"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e6eb;border-radius:14px;overflow:hidden">
<tr><td style="background:#0f1115;padding:18px 28px"><a href="${esc(site)}" style="font-family:${FONT};font-size:21px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:-0.3px">KrálFilmu<span style="color:${ACCENT}">.cz</span></a></td></tr>
<tr><td style="padding:28px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1b1d22">${body}${cta ? button(cta.label, cta.url) : ''}${after || ''}</td></tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px"><tr><td align="center" style="padding:16px 10px;font-family:${FONT};font-size:11.5px;line-height:1.6;color:#8a8f99">KrálFilmu.cz · filmová databáze a komunita<br>${foot}</td></tr></table>
</td></tr></table>
</body></html>`;
}

const h1 = (t: string) => `<p style="margin:0 0 10px;font-size:20px;font-weight:800;line-height:1.3">${t}</p>`;
const p = (t: string) => `<p style="margin:10px 0 0">${t}</p>`;
const small = (t: string) => `<p style="margin:14px 0 0;color:#7a7f89;font-size:12.5px;line-height:1.55">${t}</p>`;
const fallbackLink = (url: string) =>
  small(`Tlačítko nefunguje? Zkopíruj do prohlížeče tento odkaz:<br><a href="${esc(url)}" style="color:#2a6fd6;word-break:break-all">${esc(url)}</a>`);

// 1. Overenie e-mailu po registrácii
export function verifyEmailTemplate(name: string, url: string) {
  return {
    subject: 'Potvrď svůj e-mail',
    html: layout({
      preheader: 'Poslední krok k dokončení registrace',
      body: h1(`Ahoj, ${esc(name)}`) + p('děkujeme za registraci na KrálFilmu.cz. Potvrď prosím svou e-mailovou adresu, ať se můžeš přihlásit.'),
      cta: { label: 'Potvrdit e-mail', url },
      after: fallbackLink(url) + small('Odkaz platí 48 hodin. Pokud ses neregistroval, e-mail ignoruj.'),
      footer: 'account'
    }),
    text: `Ahoj, ${name}\n\nPotvrď prosím svou e-mailovou adresu: ${url}\n\nOdkaz platí 48 hodin.`
  };
}

// 2. Obnovenie hesla
export function resetPasswordTemplate(name: string, url: string) {
  return {
    subject: 'Obnovení hesla',
    html: layout({
      preheader: 'Odkaz na nastavení nového hesla',
      body: h1('Zapomenuté heslo') + p(`někdo (snad ty) požádal o obnovení hesla k účtu <b>${esc(name)}</b>. Nové heslo nastavíš tlačítkem níže.`),
      cta: { label: 'Nastavit nové heslo', url },
      after:
        fallbackLink(url) +
        small('Odkaz platí 1 hodinu a dá se použít jen jednou. Pokud jsi o obnovení nežádal, nic nedělej, heslo zůstává beze změny.'),
      footer: 'account'
    }),
    text: `Obnovení hesla k účtu ${name}: ${url}\n\nOdkaz platí 1 hodinu. Pokud jsi o obnovení nežádal, e-mail ignoruj.`
  };
}

// 3. Novinka
export function newsTemplate(n: { title: string; summary: string; coverImage: string | null; url: string }, unsubscribeUrl: string) {
  const cover =
    n.coverImage && /^https?:\/\//.test(n.coverImage)
      ? `<img src="${esc(n.coverImage)}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border-radius:10px;margin:0 0 18px">`
      : '';
  return {
    subject: n.title,
    html: layout({
      preheader: n.summary || 'Novinka z KrálFilmu.cz',
      body:
        cover +
        `<div style="color:${ACCENT};font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase">Novinka</div>` +
        `<p style="margin:6px 0 0;font-size:20px;font-weight:800;line-height:1.3">${esc(n.title)}</p>` +
        (n.summary ? `<p style="margin:10px 0 0;color:#454952">${esc(n.summary)}</p>` : ''),
      cta: { label: 'Přečíst celý článek', url: n.url },
      footer: { unsubscribeUrl }
    }),
    text: `${n.title}\n\n${n.summary || ''}\n\n${n.url}\n\nOdhlásit odběr: ${unsubscribeUrl}`
  };
}

// 4. Film z Chci vidět / Oblíbených je online
export function onlineTemplate(
  m: { title: string; meta: string; poster: string | null; url: string },
  canPlay: boolean,
  unsubscribeUrl: string
) {
  const poster =
    m.poster && /^https?:\/\//.test(m.poster)
      ? `<td width="86" valign="top" style="padding-right:16px"><img src="${esc(m.poster)}" alt="" width="86" style="display:block;width:86px;height:auto;border-radius:8px"></td>`
      : '';
  return {
    subject: `${m.title} je online`,
    html: layout({
      preheader: `${m.title} můžeš sledovat online`,
      body:
        h1('Je online') +
        p('film nebo seriál z tvého seznamu <b>Chci vidět</b> či <b>Oblíbených</b> se dá sledovat online.') +
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;border:1px solid #e3e6eb;border-radius:12px"><tr><td style="padding:12px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>${poster}<td valign="middle"><div style="font-weight:800;font-size:17px">${esc(m.title)}</div><div style="color:#7a7f89;font-size:13px;margin-top:4px">${esc(m.meta)}</div></td></tr></table></td></tr></table>`,
      cta: { label: canPlay ? 'Přehrát online' : 'Zobrazit film', url: m.url },
      footer: { unsubscribeUrl }
    }),
    text: `${m.title} je online: ${m.url}\n\nOdhlásit odběr: ${unsubscribeUrl}`
  };
}

// 5. Nová správa v pošte
export function messageTemplate(sender: string, preview: string, url: string, unsubscribeUrl: string) {
  return {
    subject: `Nová zpráva od ${sender}`,
    html: layout({
      preheader: `${sender} ti napsal na KrálFilmu.cz`,
      body:
        h1('Nová zpráva') +
        `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px"><tr>
<td width="40" valign="top"><div style="width:40px;height:40px;border-radius:20px;background:#2c3a55;color:#cfe0ff;font-weight:800;font-size:16px;line-height:40px;text-align:center">${esc(sender.slice(0, 1).toUpperCase())}</div></td>
<td style="padding-left:12px"><div style="background:#f2f3f6;border-radius:4px 14px 14px 14px;padding:12px 14px"><div style="font-weight:700;font-size:14px">${esc(sender)}</div><div style="color:#454952;margin-top:4px">${esc(preview)}</div></div></td>
</tr></table>` +
        small('Další zprávy v této konverzaci ti hodinu nepřijdou e-mailem, ať tě nezahltíme.'),
      cta: { label: 'Odpovědět', url },
      footer: { unsubscribeUrl }
    }),
    text: `${sender} ti napsal: ${preview}\n\n${url}\n\nOdhlásit odběr: ${unsubscribeUrl}`
  };
}
