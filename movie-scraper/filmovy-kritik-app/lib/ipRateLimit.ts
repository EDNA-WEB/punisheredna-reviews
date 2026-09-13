// Ľahký rate limiter podľa IP adresy pre verejné (neprihlásené) API ako vyhľadávanie.
// Drží si stav len v pamäti bežiaceho servera — pri reštarte sa vynuluje, čo je
// v poriadku pre tento účel (ochrana pred jednoduchým zahltením, nie prísna kvóta).
const hits = new Map<string, number[]>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function checkKeyRateLimit(bucketKey: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(bucketKey) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    hits.set(bucketKey, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(bucketKey, timestamps);

  // Priebežné čistenie, nech mapa nerastie donekonečna
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }

  return true;
}

export function checkIpRateLimit(req: Request, key: string, windowMs: number, max: number): boolean {
  const ip = getClientIp(req);
  return checkKeyRateLimit(`${key}:${ip}`, windowMs, max);
}
