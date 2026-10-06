import { prisma } from '../prisma';
import { ipFromHeaders, uaFromHeaders } from './clientInfo';
import { checkIpRateLimit } from '../ipRateLimit';

// ---------------------------------------------------------------------------
// POKUSY O REGISTRÁCIU — každý pokus z webu aj z appky (aj neúspešný).
// Zapája sa ako obal okolo pôvodnej registrácie (scripts/bezpecnost-setup.mjs),
// takže samotná logika registrácie ostáva nezmenená.
// ---------------------------------------------------------------------------

export const RESULT_LABELS: Record<string, string> = {
  ok: 'Úspěšná',
  disposable: 'Dočasný e-mail',
  rate_limit: 'Příliš mnoho pokusů',
  exists: 'E-mail / přezdívka už existuje',
  invalid: 'Neplatné údaje',
  disabled: 'Registrace vypnuté',
  bot: 'Robot (zachycen)',
  error: 'Chyba serveru'
};

export const FAILED_RESULTS = ['disposable', 'rate_limit', 'exists', 'invalid', 'disabled', 'bot', 'error'];

function maskEmailForLog(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local.slice(0, Math.min(3, Math.max(1, local.length - 1)))}***@${domain}`.slice(0, 190);
}

async function classify(res: Response): Promise<string> {
  let data: any = {};
  try {
    data = await res.clone().json();
  } catch {}
  if (res.status === 429) return 'rate_limit';
  if (res.ok) return data?.ok && data?.needsVerification === undefined && data?.token === undefined && data?.user === undefined ? 'bot' : 'ok';
  if (data?.code === 'EMAIL_NOT_ALLOWED') return 'disposable';
  if (res.status === 403) return 'disabled';
  if (res.status === 409) return 'exists';
  if (res.status >= 500) return 'error';
  return 'invalid';
}

// Max. 8 pokusov o registráciu za 15 minút z jednej IP adresy.
const RATE_WINDOW_MS = 15 * 60_000;
const RATE_MAX = 8;

export async function withRegistrationLog<A extends any[]>(
  source: 'web' | 'app',
  args: A,
  handler: (...args: A) => Promise<Response>
): Promise<Response> {
  const req = args[0] as Request;
  let email: string | null = null;
  try {
    const body = await req.clone().json();
    if (typeof body?.email === 'string') email = body.email.toLowerCase().trim();
  } catch {}

  let res: Response;
  if (!(await checkIpRateLimit(req, `register-${source}`, RATE_WINDOW_MS, RATE_MAX))) {
    res = Response.json({ error: 'Příliš mnoho pokusů o registraci. Zkus to prosím za chvíli znovu.' }, { status: 429 });
  } else {
    res = await handler(...args);
  }

  try {
    const result = await classify(res);
    await prisma.registrationAttempt.create({
      data: {
        source,
        result,
        emailMasked: email ? maskEmailForLog(email) : null,
        emailDomain: email && email.includes('@') ? email.split('@')[1].slice(0, 190) : null,
        ip: ipFromHeaders(req.headers),
        userAgent: uaFromHeaders(req.headers)
      }
    });
  } catch (err) {
    console.error('[registrationLog]', err);
  }
  return res;
}
