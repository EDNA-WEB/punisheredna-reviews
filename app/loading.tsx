// Toto je záložný "kostrový náčrt" pre KAŽDÚ stránku, čo nemá svoj vlastný —
// preto musí byť neutrálny a fungovať vizuálne dobre kdekoľvek (nastavenia,
// diskusie, administrácia...), nie tvarovaný podľa jednej konkrétnej stránky.
export default function Loading() {
  return (
    <div className="pt-10 flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-2 border-line border-t-accent rounded-full animate-spin" />
    </div>
  );
}
