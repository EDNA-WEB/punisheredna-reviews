// Informace o zpracování (čl. 13 GDPR) na zdieľanej verzii článku — bez odkazov
// a bez rozbaľovania, aby sa z článku nedalo nikam preklikať.
export default function SharedPrivacyNote() {
  return (
    <div className="mt-12 pt-6 border-t border-line text-[12px] text-muted leading-relaxed space-y-2 max-w-3xl">
      <p className="font-semibold text-ink">Měření návštěvnosti a ochrana soukromí</p>
      <p>
        Abychom věděli, odkud čtenáři k článku přicházejí, měříme anonymně návštěvnost této stránky. Nepoužíváme cookies ani jiné ukládání do vašeho
        zařízení a vaši IP adresu neukládáme — pouze její zkrácenou podobu zpracujeme na nevratný, každý den měněný kód.
      </p>
      <p>
        Zaznamenáváme: zdroj návštěvy (odkaz, ze kterého jste přišli — pouze doména), typ zařízení, operační systém a prohlížeč (bez verzí detailnějších
        než hlavní), zemi, kraj a město podle sítě a poskytovatele připojení (název sítě, nikoli vaši totožnost).
      </p>
      <p>
        Účel: statistika dosahu sdíleného obsahu. Právní základ: oprávněný zájem (čl. 6 odst. 1 písm. f GDPR). Podrobné záznamy mažeme automaticky po 30
        dnech, poté zůstávají jen anonymní souhrnné počty. Údaje nepředáváme třetím stranám kromě technických zpracovatelů (hosting Vercel, databáze Neon).
        Protože nevíme, kdo jste, nelze vás v datech zpětně dohledat. Dotazy a uplatnění práv: provozovatel webu KrálFilmu.cz, kontakt v zásadách ochrany
        osobních údajů na webu. Máte právo podat stížnost u Úřadu pro ochranu osobních údajů.
      </p>
    </div>
  );
}
