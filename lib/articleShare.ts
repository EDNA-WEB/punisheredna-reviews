import { prisma } from './prisma';
import { memo } from './memoCache';

// ---------------------------------------------------------------------------
// Dočasné zdieľanie článkov verejnosti (zapína/vypína admin v Administrace →
// Sdílení článků). Zdieľací odkaz /sdilet/… ukáže neprihlásenému LEN samotný
// článok — bez menu, hlavičky, päty, komentárov, prihlásenia a bez odkazov,
// cez ktoré by sa dalo dostať kamkoľvek inam. Prihlásený dostane bežnú stránku.
// ---------------------------------------------------------------------------

export async function isArticleShareEnabled() {
  return memo('articleShare:enabled', 20_000, async () => {
    const s = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { articleShareEnabled: true } });
    return !!s?.articleShareEnabled;
  });
}

// Odkazy v texte článku → obyčajný text (návštevník sa nesmie preklikať ďalej).
export function neutralizeLinks(html: string) {
  return html
    .replace(/<a\b[^>]*>/gi, '<span class="shared-link">')
    .replace(/<\/a>/gi, '</span>');
}
