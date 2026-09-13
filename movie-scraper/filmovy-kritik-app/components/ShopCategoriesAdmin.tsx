'use client';

import { useState } from 'react';

type CategoryItem = { id: string; name: string; slug: string; icon: string | null; order: number; _count: { products: number } };

export default function ShopCategoriesAdmin({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/shop/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories((prev) => [...prev, { ...data, _count: { products: 0 } }]);
      setNewName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editDraft.trim()) return;
    const res = await fetch(`/api/shop/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editDraft.trim() })
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: editDraft.trim() } : c)));
    }
    setEditingId(null);
  }

  async function removeCategory(id: string) {
    if (!confirm('Naozaj zmazať túto kategóriu? Zmažú sa aj všetky produkty v nej.')) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/shop/categories/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="max-w-xl">
      <div className="flex gap-2 mb-6">
        <input
          className="field-input flex-1"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Názov novej kategórie (napr. Netflix)"
        />
        <button
          onClick={addCategory}
          disabled={saving || !newName.trim()}
          className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
        >
          Pridať
        </button>
      </div>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            {editingId === c.id ? (
              <>
                <input
                  className="field-input-sm flex-1"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  autoFocus
                />
                <button onClick={() => saveEdit(c.id)} className="text-xs font-semibold text-accent hover:underline flex-none">
                  Uložiť
                </button>
                <button onClick={() => setEditingId(null)} className="text-xs text-muted hover:underline flex-none">
                  Zrušiť
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-semibold text-ink">{c.name}</span>
                <span className="text-xs text-muted flex-none">{c._count.products} produktov</span>
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setEditDraft(c.name);
                  }}
                  className="text-xs font-semibold text-accent hover:underline flex-none"
                >
                  Upraviť
                </button>
                <button onClick={() => removeCategory(c.id)} className="text-muted hover:text-danger flex-none">
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted p-4">Zatiaľ žiadne kategórie.</p>}
      </div>
    </div>
  );
}
