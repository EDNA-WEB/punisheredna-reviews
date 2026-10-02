// Dve postavičky, ktoré sa na ZDIEĽANOM článku striedavo pomaly vysúvajú
// z pravého dolného rohu obrazovky (mierne natočené) a zase zasúvajú.
// Zobrazujú sa len na stránkach /sdilet/… (zdieľané články).
export default function SharedPeek() {
  return (
    <div className="kf-peek" aria-hidden="true">
      <img src="/sdilet/postavicka-1.webp" alt="" className="kf-peek-img kf-peek-a" draggable={false} />
      <img src="/sdilet/postavicka-2.webp" alt="" className="kf-peek-img kf-peek-b" draggable={false} />
      <style>{`
        .kf-peek{position:fixed;right:0;bottom:0;width:clamp(120px,17vw,230px);height:clamp(120px,17vw,230px);pointer-events:none;z-index:50;overflow:visible}
        .kf-peek-img{position:absolute;right:0;bottom:0;width:100%;height:auto;transform-origin:100% 100%;opacity:0;
          transform:translate(78%,82%) rotate(-30deg);will-change:transform,opacity;
          animation:kfPeek 20s ease-in-out infinite both;filter:drop-shadow(0 6px 14px rgba(0,0,0,.25))}
        .kf-peek-b{animation-delay:10s}
        @keyframes kfPeek{
          0%{transform:translate(78%,82%) rotate(-30deg);opacity:0}
          3%{opacity:1}
          15%{transform:translate(14%,16%) rotate(-14deg)}
          25%{transform:translate(12%,14%) rotate(-11deg)}
          35%{transform:translate(14%,16%) rotate(-14deg)}
          48%{transform:translate(78%,82%) rotate(-30deg);opacity:1}
          50%,100%{transform:translate(78%,82%) rotate(-30deg);opacity:0}
        }
        @media (prefers-reduced-motion:reduce){
          .kf-peek-img{animation:none}
          .kf-peek-a{opacity:1;transform:translate(14%,16%) rotate(-14deg)}
        }
      `}</style>
    </div>
  );
}
