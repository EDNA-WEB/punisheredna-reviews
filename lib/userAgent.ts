// Ľahké, orientačné rozpoznanie prehliadača a operačného systému z hlavičky
// User-Agent — nie je to presný parser (tie sú zložité a krehké), len na
// zobrazenie zrozumiteľného popisu typu "Chrome, Windows" na potvrdzovacej
// stránke QR prihlásenia.
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'neznáme zariadenie';

  let browser = 'neznámy prehliadač';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return os ? `${browser}, ${os}` : browser;
}
