export const dynamic = 'force-dynamic';

export default function HboContestPage() {
  return (
    <div className="pt-8 max-w-2xl mx-auto pb-16">
      <img src="/sutaz-hbo-banner.jpg" alt="Súťaž o HBO predplatné na celý rok" className="w-full rounded-xl mb-6" />

      <h1 className="font-display font-extrabold text-3xl text-ink mb-4">Súťaž o HBO predplatné na celý rok</h1>

      {/*
        TOTO JE ŠABLÓNA — doplň sem skutočné podmienky súťaže (ako sa zapojiť,
        do kedy trvá, ako sa vyberie výherca, atď.). Nevymýšľal som si oficiálne
        pravidlá súťaže sám, keďže tie musíš poznať presne ty.
      */}
      <div className="border border-line rounded-xl p-5 bg-card space-y-4 text-ink">
        <p className="text-muted italic">
          ⚠️ Toto je len šablóna — nahraď tento text skutočnými pravidlami súťaže (ako sa zapojiť, termín ukončenia,
          spôsob výberu výhercu, atď.).
        </p>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">Čo môžeš vyhrať</h2>
          <p className="text-sm">Ročné predplatné HBO Max.</p>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">Ako sa zapojiť</h2>
          <p className="text-sm">[Doplň presný postup — napr. komentár pod príspevkom, sledovanie na sociálnej sieti, a pod.]</p>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">Termín súťaže</h2>
          <p className="text-sm">[Doplň dátum začiatku a konca súťaže]</p>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">Vyhlásenie výhercu</h2>
          <p className="text-sm">[Doplň, kedy a ako sa výherca dozvie o výhre]</p>
        </div>
      </div>
    </div>
  );
}
