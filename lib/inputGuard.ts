// Ochrana proti "injekcii operátorov" do Prismy (tzv. NoSQL injection).
// Prisma akceptuje v podmienke aj objekt, napr. { id: { not: '' } } = "všetky
// okrem prázdneho". Keby sme takú hodnotu z tela požiadavky (JSON) poslali
// rovno do where, útočník by mohol zasiahnuť cudzie záznamy. Preto hodnoty z
// požiadavky smú byť len obyčajný text / číslo / true-false, prípadne zoznam
// takých hodnôt. null a undefined sa nechávajú na bežnú kontrolu v route.
function isPrimitive(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

export function isSafeInput(v: unknown): boolean {
  if (isPrimitive(v)) return typeof v !== 'string' || v.length <= 10_000;
  if (Array.isArray(v)) return v.length <= 1000 && v.every((x) => isPrimitive(x));
  return false; // objekt → podozrivé
}

// true = aspoň jedna hodnota je podozrivá (objekt) → route má vrátiť 400
export function hasInjectedObject(...values: unknown[]): boolean {
  return values.some((v) => !isSafeInput(v));
}
