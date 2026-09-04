'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type VariantDraft = { label: string; price: string; originalPrice: string; isBestDeal: boolean; isGreatPrice: boolean };
type CategoryItem = { id: string; name: string };

type Initial = {
  id?: string;
  categoryId?: string;
  title?: string;
  image?: string | null;
  platform?: string | null;
  type?: string;
  region?: string;
  description?: string | null;
  activationInfo?: string | null;
  regionRestriction?: string | null;
  rating?: number | null;
  reviewCount?: number;
  sponsored?: boolean;
  sellerName?: string | null;
  approved?: boolean;
  variants?: { label: string; price: number; originalPrice: number | null; isBestDeal: boolean; isGreatPrice: boolean }[];
};

export default function ShopProductForm({ categories, initial }: { categories: CategoryItem[]; initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories[0]?.id || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [image, setImage] = useState(initial?.image || '');
  const [platform, setPlatform] = useState(initial?.platform || '');
  const [type, setType] = useState(initial?.type || 'Key');
  const [region, setRegion] = useState(initial?.region || 'UNITED STATES');
  const [description, setDescription] = useState(initial?.description || '');
  const [activationInfo, setActivationInfo] = useState(initial?.activationInfo || '');
  const [regionRestriction, setRegionRestriction] = useState(initial?.regionRestriction || '');
  const [rating, setRating] = useState(initial?.rating?.toString() || '');
  const [reviewCount, setReviewCount] = useState(initial?.reviewCount?.toString() || '');
  const [sponsored, setSponsored] = useState(initial?.sponsored || false);
  const [sellerName, setSellerName] = useState(initial?.sellerName || '');
  const [approved, setApproved] = useState(initial?.approved ?? true);
  const [variants, setVariants] = useState<VariantDraft[]>(
    initial?.variants?.length
      ? initial.variants.map((v) => ({
          label: v.label,
          price: v.price.toString(),
          originalPrice: v.originalPrice?.toString() || '',
          isBestDeal: v.isBestDeal,
          isGreatPrice: v.isGreatPrice
        }))
      : [{ label: '15 USD', price: '', originalPrice: '', isBestDeal: false, isGreatPrice: false }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addVariant() {
    setVariants((prev) => [...prev, { label: '', price: '', originalPrice: '', isBestDeal: false, isGreatPrice: false }]);
  }
  function updateVariant(i: number, field: keyof VariantDraft, value: string | boolean) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
  }
  function removeVariant(i: number) {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !categoryId) {
      setError('Vyplň aspoň názov a kategóriu.');
      return;
    }
    const validVariants = variants.filter((v) => v.label.trim() && v.price);
    if (validVariants.length === 0) {
      setError('Pridaj aspoň jeden variant s cenou.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        categoryId,
        title: title.trim(),
        image,
        platform: platform || null,
        type,
        region,
        description: description || null,
        activationInfo: activationInfo || null,
        regionRestriction: regionRestriction || null,
        rating: rating || null,
        reviewCount: reviewCount || 0,
        sponsored,
        sellerName: sellerName || null,
        approved,
        variants: validVariants.map((v) => ({
          label: v.label.trim(),
          price: v.price,
          originalPrice: v.originalPrice || null,
          isBestDeal: v.isBestDeal,
          isGreatPrice: v.isGreatPrice
        }))
      };

      const res = await fetch(isEdit ? `/api/shop/products/${initial!.id}` : '/api/shop/products', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      router.push('/admin/obchod/produkty');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Kategória</label>
        <select className="field-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Názov produktu</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="napr. Netflix Gift Card 15 USD" required />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Obrázok</label>
        {image && <img src={image} alt="" className="w-32 h-32 object-cover rounded-lg border border-line mb-2" />}
        <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Platforma</label>
          <input className="field-input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="napr. Netflix" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Typ</label>
          <input className="field-input" value={type} onChange={(e) => setType(e.target.value)} placeholder="napr. Key" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Región</label>
          <input className="field-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="napr. UNITED STATES" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Obmedzenie regiónu (voliteľné)</label>
          <input className="field-input" value={regionRestriction} onChange={(e) => setRegionRestriction(e.target.value)} placeholder="napr. Can't activate in Slovakia" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Popis</label>
        <textarea className="field-input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Návod na aktiváciu</label>
        <textarea className="field-input min-h-[60px]" value={activationInfo} onChange={(e) => setActivationInfo(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Hodnotenie (0-5, voliteľné)</label>
          <input className="field-input" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="napr. 5.0" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Počet recenzií</label>
          <input className="field-input" value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} placeholder="napr. 14" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Meno predajcu (voliteľné)</label>
        <input className="field-input" value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="napr. Instant_game" />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={sponsored} onChange={(e) => setSponsored(e.target.checked)} />
          Sponzorované
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
          Viditeľné na webe
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-ink">Varianty (napr. 15 USD, 20 USD…)</label>
          <button type="button" onClick={addVariant} className="text-xs font-semibold text-accent hover:underline">
            + Pridať variant
          </button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="border border-line rounded-lg p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  className="field-input-sm flex-1"
                  value={v.label}
                  onChange={(e) => updateVariant(i, 'label', e.target.value)}
                  placeholder="Popis (napr. 15 USD)"
                />
                <input
                  className="field-input-sm w-28"
                  value={v.price}
                  onChange={(e) => updateVariant(i, 'price', e.target.value)}
                  placeholder="Cena"
                  type="number"
                  step="0.01"
                />
                <input
                  className="field-input-sm w-28"
                  value={v.originalPrice}
                  onChange={(e) => updateVariant(i, 'originalPrice', e.target.value)}
                  placeholder="Pôvodná cena"
                  type="number"
                  step="0.01"
                />
                <button type="button" onClick={() => removeVariant(i)} className="text-muted hover:text-danger flex-none">✕</button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-ink">
                  <input type="checkbox" checked={v.isBestDeal} onChange={(e) => updateVariant(i, 'isBestDeal', e.target.checked)} />
                  Best deal
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink">
                  <input type="checkbox" checked={v.isGreatPrice} onChange={(e) => updateVariant(i, 'isGreatPrice', e.target.checked)} />
                  Great price
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-accent text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-accent-dark disabled:opacity-50"
      >
        {saving ? 'Ukladám…' : isEdit ? 'Uložiť zmeny' : 'Vytvoriť produkt'}
      </button>
    </form>
  );
}
