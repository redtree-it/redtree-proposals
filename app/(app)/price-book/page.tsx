import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormSelect, Notice } from "@/app/_components/FormField";
import {
  formatPence,
  PRICE_CATEGORIES,
  PRICE_CATEGORY_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
} from "@/lib/validation/price-book";

export default async function PriceBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const [items, { error }] = await Promise.all([
    prisma.priceBookItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    searchParams,
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Price Book</h1>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Unit price</th>
            <th className="py-2 font-medium">Unit type</th>
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium">Default</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100">
              <td className="py-2">
                <Link href={`/price-book/${item.id}`} className="font-medium text-neutral-900 hover:underline">
                  {item.name}
                </Link>
                {!item.active && (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                    Archived
                  </span>
                )}
              </td>
              <td className="py-2 text-neutral-600">{formatPence(item.unitPricePence)}</td>
              <td className="py-2 text-neutral-600">{UNIT_TYPE_LABELS[item.unitType]}</td>
              <td className="py-2 text-neutral-600">{PRICE_CATEGORY_LABELS[item.category]}</td>
              <td className="py-2 text-neutral-600">{item.defaultIncluded ? "Included" : "Optional"}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-400">
                No price book items yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Add item</h2>
      {error && <Notice kind="error" message={error} />}

      <form action="/api/price-book" method="POST" className="mt-4 max-w-2xl space-y-4">
        <FormField label="Name" name="name" required />
        <FormField label="Description" name="description" />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Unit price (£)" name="unitPricePounds" type="number" defaultValue="0.00" />
          <FormSelect
            label="Unit type"
            name="unitType"
            options={UNIT_TYPES.map((t) => ({ value: t, label: UNIT_TYPE_LABELS[t] }))}
          />
          <FormSelect
            label="Category"
            name="category"
            options={PRICE_CATEGORIES.map((c) => ({ value: c, label: PRICE_CATEGORY_LABELS[c] }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="defaultIncluded" defaultChecked />
          Included by default when added to a proposal
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Add item
        </button>
      </form>
    </div>
  );
}
