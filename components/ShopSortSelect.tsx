'use client';

export default function ShopSortSelect({ currentSort, categorySlug }: { currentSort: string; categorySlug?: string }) {
  return (
    <form>
      {categorySlug && <input type="hidden" name="kategoria" value={categorySlug} />}
      <select
        name="sort"
        defaultValue={currentSort}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="field-input-sm"
      >
        <option value="najnovsie">Najnovšie</option>
        <option value="najlacnejsie">Najlacnejšie</option>
        <option value="najdrahsie">Najdrahšie</option>
      </select>
    </form>
  );
}
