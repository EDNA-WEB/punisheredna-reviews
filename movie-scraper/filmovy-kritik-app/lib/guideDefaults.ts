export type GuideItem = { question: string; answer: string };

export const DEFAULT_GUIDE_ITEMS: GuideItem[] = [
  {
    question: 'Co je PunisherEDNA reviews?',
    answer: `Běží v kině, na VOD službě nebo v televizi film či seriál, o kterém jsi nikdy neslyšel a nechceš riskovat zklamání?

Zahlédl jsi někde zajímavý, ale neznámý titul a chceš se o něm dozvědět víc, nebo si o něm popovídat s ostatními filmovými fanoušky?

Chceš na základě vlastních hodnocení najít filmy a seriály, které by se ti mohly líbit, a nechceš přehlédnout žádnou novou epizodu oblíbeného seriálu?

Chceš se k filmu vyjádřit vlastní recenzí, nebo si jen chceš přehledně vést seznam toho, co jsi viděl a co ještě vidět chceš?

Přesně na tohle tu je PunisherEDNA reviews.`
  },
  {
    question: 'Proč se registrovat?',
    answer: `I bez registrace si můžeš prohlížet databázi filmů a seriálů, filmografie herců a tvůrců, koukat na trailery, prohlížet galerie a číst recenze ostatních uživatelů.

Pokud se zaregistruješ, navíc získáš možnost:

Hodnotit filmy a seriály hvězdičkami od půl hvězdy do pěti, čímž se podílíš na výsledném procentuálním hodnocení a jeho místě v žebříčcích.
Psát vlastní recenze k filmům a seriálům.
Používat funkci "Chci vidět" — když přibude nová série nebo epizoda u seriálu, který takto máš označený, dostaneš o tom upozornění přímo na webu.
Označovat si epizody a série jako zhlédnuté, a sledovat tak svůj postup u rozkoukaného seriálu.
Přidávat si filmy, seriály, herce a tvůrce mezi oblíbené.
Zapojovat se do diskuzí pod filmy a seriály, případně sledovat diskuzi, která tě zajímá.
Psát si vlastní blogové články, a ty nejlepší z nich se mohou po schválení administrátorem objevit i mezi novinkami na hlavní stránce.`
  },
  {
    question: 'Jak se filmy hodnotí hvězdičkami?',
    answer: `Film nebo seriál hodnotíš hvězdičkami přímo na jeho profilu, v rozsahu od půl hvězdy do pěti (tedy v krocích po polovině hvězdy — např. 3,5 nebo 4,5). Hodnocení můžeš kdykoli změnit nebo zrušit.

Film nebo seriál je možné hodnotit až po jeho premiéře — u ještě nevydaného titulu se hodnocení nedá zadat.

Snaž se prosím hodnotit jen to, co jsi opravdu viděl. Hodnocení na základě traileru, předsudků nebo domněnek zkresluje výsledné procento pro ostatní uživatele.`
  },
  {
    question: 'Hodnocení seriálů, sérií a epizod',
    answer: `Seriál můžeš hodnotit na třech úrovních — buď mu dáš jedno hlavní hodnocení jako celku, nebo hodnotíš jednotlivé série, případně přímo jednotlivé epizody.

Pokud ohodnotíš epizody, průměr z nich se ti při hodnocení nadřazené série zobrazí jako navrhovaná hodnota (vyplněné hvězdičky při nižší průhlednosti) — stačí ji potvrdit, nebo klidně zadat vlastní.

Konkrétní sérii je možné hodnotit až tehdy, když je administrátorem označená jako vydaná. Stejné pravidlo platí i pro samotné epizody v jejím rámci.`
  },
  {
    question: 'Jak se filmy a seriály recenzují?',
    answer: `Recenzi napíšeš přímo na profilu filmu, série nebo epizody — stačí být přihlášený. Formulář na recenzi najdeš u hvězdičkového hodnocení, obojí se dá odeslat i najednou.

Recenze by měla být rozumně vyjádřeným názorem na film nebo seriál — proč se ti líbil nebo nelíbil, co v něm fungovalo nebo nefungovalo. Hvězdičky vyjadřují NAKOLIK se ti něco líbilo, recenze je prostor pro to, PROČ.

Administrátor může některému uživateli možnost psát recenze (případně i hodnotit) omezit, pokud dlouhodobě porušuje pravidla portálu.`
  },
  {
    question: 'Karma a oblíbení uživatelé',
    answer: `Každý uživatel má svou karmu — číslo, které roste s tím, jak jsou jeho recenze a hodnocení užitečné a oblíbené u ostatních. Recenze od uživatelů s vyšší karmou se na profilu filmu zobrazují přednostně.

Jiné uživatele si můžeš přidat mezi oblíbené přímo na jejich profilu. Usnadní ti to sledovat, co nového hodnotí a recenzují, prostřednictvím záložky "Aktivita".`
  },
  {
    question: 'Jak si nastavím svůj profil?',
    answer: `Popis "O mně" a profilovou fotku si nastavíš v úpravě svého profilu, dostupné po kliknutí na svou přezdívku. Je to hlavní místo, kde ostatním napíšeš, kdo jsi a proč máš rád filmy.

Do svých oblíbených si kromě uživatelů můžeš přidat i filmy, seriály, herce a tvůrce — najdeš je pak přehledně v záložce "Oblíbenci" na svém profilu, veřejně viditelné i pro ostatní.`
  },
  {
    question: 'Jak fungují žebříčky?',
    answer: `Žebříčky nejlepších filmů a seriálů neberou v potaz jen samotné procentuální hodnocení, ale i počet hodnocení, ze kterých vychází. Film s 90 % z tisícovky hodnocení má v žebříčku větší váhu než film s vyšším hodnocením 95 %, ale jen z deseti hodnocení.

Díky tomu se na přední příčky nedostanou náhodou tituly, které vidělo jen hrstka lidí a nedají se tedy zodpovědně doporučit.

V sekci Žebříčky si můžeš přepnout mezi žebříčkem filmů a žebříčkem seriálů.`
  },
  {
    question: 'Jak fungují diskuze?',
    answer: `Do diskuze pod konkrétním filmem nebo seriálem se může zapojit kdokoli přihlášený. Diskuzi si také můžeš označit ke sledování, abys nezmeškal nové příspěvky, na které tě upozorníme notifikací.`
  },
  {
    question: 'Chybí ti na webu film, seriál či osobnost?',
    answer: `Návrh na přidání filmu nebo seriálu, případně herce či tvůrce, nám pošli přes formuláře "Přidat film" a "Přidat osobnost", dostupné z hlavní navigace. Tvůj návrh projde schválením administrátorem, než se objeví veřejně na webu.`
  },
  {
    question: 'Co se na portálu nesmí?',
    answer: `Očekáváme slušné chování vůči ostatním, žádný spam, a hodnocení či recenze jen k tomu, co jsi opravdu viděl. Podrobný seznam najdeš v Pravidlech portálu, dostupných v patičce webu.`
  },
  {
    question: 'Máš otázku, která tu chybí?',
    answer: `Napiš nám prosím přes formulář "Napiš nám", dostupný v patičce webu — rádi ti poradíme.`
  }
];
