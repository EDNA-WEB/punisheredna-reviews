'use client';

import { useState } from 'react';

type Variant = {
  id: string;
  label: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  isBestDeal: boolean;
  isGreatPrice: boolean;
};

export default function ShopVariantSelector({ variants }: { variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const selected = variants.find((v) => v.id === selectedId) || variants[0];
  const discount = selected?.originalPrice ? Math.round((1 - selected.price / selected.originalPrice) * 100) : 0;

  return (
    <div>
      <div className="text-xs text-muted mb-2">Množstvo:</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedId(v.id)}
            className={`relative border rounded-lg py-2 text-sm font-semibold transition-colors ${
              selectedId === v.id ? 'border-accent bg-accent/5 text-accent' : 'border-line text-ink hover:border-accent'
            }`}
          >
            {v.label}
            {v.isBestDeal && (
              <span className="absolute -top-2 -right-1.5 text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">TOP</span>
            )}
            {v.isGreatPrice && !v.isBestDeal && (
              <span className="absolute -top-2 -right-1.5 text-[8px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">%</span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className="border-t border-line pt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-2xl text-ink">{selected.price.toFixed(2)}</span>
              <span className="text-sm text-muted">{selected.currency}</span>
            </div>
            {selected.originalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted line-through">{selected.originalPrice.toFixed(2)} {selected.currency}</span>
                {discount > 0 && <span className="text-xs font-bold text-white bg-danger px-1.5 py-0.5 rounded">-{discount}%</span>}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => alert('Nákupný košík zatiaľ nie je dostupný — táto funkcia sa čoskoro pridá.')}
            className="bg-accent text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-accent-dark"
          >
            Pridať do košíka
          </button>
        </div>
      )}
    </div>
  );
}
