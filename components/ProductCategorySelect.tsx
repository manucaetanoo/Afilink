import { PRODUCT_CATEGORIES } from "@/lib/product-categories";

export default function ProductCategorySelect({
  value,
  onChange,
}: { value?: string; onChange?: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="product-category" className="mb-2 block text-sm font-semibold text-slate-900">
        Categoría
      </label>
      <select
        id="product-category"
        name="category"
        required
        {...(value === undefined ? { defaultValue: "" } : { value })}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        <option value="" disabled>Elegí una categoría</option>
        {PRODUCT_CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>{category.label}</option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">Ayudá a que encuentren tu producto en los filtros del catálogo.</p>
    </div>
  );
}
