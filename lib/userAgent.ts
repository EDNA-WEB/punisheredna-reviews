// Ľahké rozpoznanie zariadenia, systému a prehliadača z hlavičky User-Agent
// (+ Client Hints). Ukladajú sa LEN hrubé kategorie — nikdy celý reťazec.

export type ParsedUA = { deviceType: 'mobile' | 'tablet' | 'desktop'; os: string | null; browser: string | null };

const major = (v?: string | null) => (v ? v.split(/[._]/)[0] : '');

export function parseUserAgent(ua: string, hints?: { platform?: string | null; mobile?: string | null }): ParsedUA {
  const s = ua || '';

  // --- zariadenie
  let deviceType: ParsedUA['deviceType'] = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk|Kindle|SM-T\d|Tab[\s-]/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) deviceType = 'tablet';
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s) || hints?.mobile === '?1') deviceType = 'mobile';
  // iPad s iPadOS sa hlási ako Mac — rozpoznáme podľa dotykového Safari
  if (deviceType === 'desktop' && /Macintosh/.test(s) && /Mobile\//.test(s)) deviceType = 'tablet';

  // --- operačný systém
  let os: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/(?:iPhone|CPU) OS (\d+)[_\d]*/))) os = `iOS ${m[1]}`;
  else if ((m = s.match(/Android (\d+)/))) os = `Android ${m[1]}`;
  else if (/Windows NT 10/.test(s)) os = 'Windows 10/11';
  else if ((m = s.match(/Windows NT (\d+\.\d)/))) os = `Windows ${m[1]}`;
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  else if ((m = s.match(/Mac OS X (\d+)[_.](\d+)/))) os = `macOS ${m[1] === '10' ? `10.${m[2]}` : m[1]}`;
  else if (/Macintosh/.test(s)) os = 'macOS';
  else if (/Linux/.test(s)) os = 'Linux';
  if (!os && hints?.platform) os = hints.platform.replace(/"/g, '');

  // --- prehliadač (poradie je dôležité — Edge/Opera sa hlásia aj ako Chrome)
  let browser: string | null = null;
  const rules: Array<[RegExp, string]> = [
    [/FBAN|FBAV|FB_IAB/, 'Facebook (v aplikaci)'],
    [/Instagram/, 'Instagram (v aplikaci)'],
    [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)|Opera\/(\d+)/, 'Opera'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/YaBrowser\/(\d+)/, 'Yandex'],
    [/Firefox\/(\d+)|FxiOS\/(\d+)/, 'Firefox'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari']
  ];
  for (const [re, name] of rules) {
    const x = s.match(re);
    if (x) {
      const v = major(x[1] || x[2]);
      browser = v && !name.includes('(') ? `${name} ${v}` : name;
      break;
    }
  }
  return { deviceType, os, browser };
}

const BOT_RE =
  /(bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|telegram|discord|slack|skype|linkedin|twitter|embedly|preview|pinterest|vkshare|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http|java\/|monitor|uptime)/i;

export function isBot(ua: string | null | undefined) {
  return !ua || ua.length < 20 || BOT_RE.test(ua);
}
