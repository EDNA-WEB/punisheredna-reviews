# Analytika sdílených článků — dokumentace GDPR

## 1. Záznam o činnosti zpracování (čl. 30 GDPR)

| Položka | Obsah |
|---|---|
| Správce | provozovatel webu KrálFilmu.cz (doplňte jméno, adresu, e-mail) |
| Účel | statistika dosahu sdílených článků: kolik lidí článek otevřelo, odkud přišli, na jakém zařízení |
| Právní základ | oprávněný zájem, čl. 6 odst. 1 písm. f) GDPR (viz test vyváženosti níže) |
| Subjekty | nepřihlášení návštěvníci, kteří otevřou článek přes sdílecí odkaz `/sdilet/…` |
| Kategorie údajů | zkrácená IP (IPv4 /24, IPv6 /48) zpracovaná na nevratný denně měněný kód (neukládá se); zdroj (štítek umístění, doména odkazujícího webu); typ zařízení, OS a prohlížeč (hlavní verze); země, kraj, město (podle sítě); poskytovatel připojení (ASN a název sítě); čas zobrazení |
| Neuchovává se | plná IP adresa, celý User-Agent, cookies, identifikátory zařízení, totožnost |
| Doba uložení | podrobné záznamy 30 dní (automatické mazání), denní sůl 1–2 dny; poté pouze anonymní souhrnné počty |
| Příjemci / zpracovatelé | Vercel Inc. (hosting, krátkodobé provozní logy), Neon Inc. (databáze); Team Cymru (DNS dotaz na síť — odchází jen síťový prefix, nikoli adresa) |
| Předání do třetích zemí | USA — Vercel, Neon (Data Privacy Framework / standardní smluvní doložky dle jejich DPA) |
| Technická opatření | zkrácení IP před zpracováním, HMAC s denně rotovanou solí, automatická retence, přístup jen pro administrátory, šifrování v přenosu i na disku, auditní log |

## 2. Test vyváženosti oprávněného zájmu (LIA)

1. **Oprávněný zájem:** vědět, jak se sdílený obsah šíří a zda má smysl ho sdílet na konkrétních místech (např. ČSFD).
2. **Nezbytnost:** bez měření nelze zjistit dosah. Zvoleno nejšetrnější řešení — bez cookies, bez plné IP, bez propojení mezi dny, bez identity.
3. **Vyvážení:** zpracování je minimální, neviditelné pro zařízení návštěvníka, krátce uchovávané, bez profilování napříč weby a bez rozhodování o člověku. Rozumný návštěvník takové měření očekává. Informace je přímo na stránce článku.
4. **Závěr:** oprávněný zájem převažuje; zpracování je přiměřené.

## 3. Text do Zásad ochrany osobních údajů (doplnit na /zasady-ochrany-udajov)

> **Měření návštěvnosti sdílených článků.** Pokud otevřete článek přes sdílecí odkaz, měříme anonymně návštěvnost: zdroj návštěvy (odkaz, ze kterého jste přišli — pouze doména, případně označení místa, kde jsme odkaz zveřejnili), typ zařízení, operační systém, prohlížeč, zemi, kraj a město podle sítě a název poskytovatele připojení. Nepoužíváme cookies ani jiné ukládání do vašeho zařízení. Vaši IP adresu neukládáme — její zkrácenou podobu zpracujeme na nevratný kód, který se každý den mění. Podrobné záznamy automaticky mažeme po 30 dnech, dále uchováváme jen souhrnné počty. Právním základem je náš oprávněný zájem na statistice dosahu obsahu (čl. 6 odst. 1 písm. f GDPR). Proti zpracování můžete vznést námitku na kontaktu níže. Protože údaje neobsahují vaši totožnost, nemusí být možné vás v nich dohledat (čl. 11 GDPR).

## 4. Žádosti orgánů

- Plná IP adresa ani totožnost **nejsou k dispozici** — vydat lze jen to, co existuje (anonymní souhrny, případně podrobnosti do 30 dní).
- Totožnost k IP adrese a času zná pouze poskytovatel připojení; vydává ji orgánům činným v trestním řízení podle trestního řádu (u provozních údajů zpravidla s příkazem soudu), uchovává je podle § 97 zákona č. 127/2005 Sb.
- Každou žádost zapsat v Administrace → Žádosti orgánů. Bez právního titulu nevydávat nic; soukromým osobám nevydávat.

*Dokument je technicko-právní podklad, nikoli právní rada. Před ostrým provozem doporučujeme kontrolu právníkem.*
