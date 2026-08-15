import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormSelect, Notice } from "@/app/_components/FormField";
import {
  penceToPoundsString,
  PRICE_CATEGORIES,
  PRICE_CATEGORY_LABELS,
  UNIT_TYPES,
  UNIT_TYPE_LABELS,
} from "@/lib/validation/price-book";

export default async function PriceBookItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const item = await prisma.priceBookItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/price-book" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← All price book items
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{item.name}</h1>

      {error && <Notice kind="error" message={error} />}
      {saved && <Notice kind="success" message="Item saved." />}

      <form action={`/api/price-book/${item.id}`} method="POST" className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={item.name} />
        <FormField label="Description" name="description" defaultValue={item.description ?? ""} />
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="Unit price (£)"
            name="unitPricePounds"
            type="number"
            defaultValue={penceToPoundsString(item.unitPricePence)}
          />
          <FormSelect
            label="Unit type"
            name="unitType"
            defaultValue={item.unitType}
            options={UNIT_TYPES.map((t) => ({ value: t, label: UNIT_TYPE_LABELS[t] }))}
          />
          <FormSelect
            label="Category"
            name="category"
            defaultValue={item.category}
            options={PRICE_CATEGORIES.map((c) => ({ value: c, label: PRICE_CATEGORY_LABELS[c] }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="defaultIncluded" defaultChecked={item.defaultIncluded} />
          Included by default when added to a proposal
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="active" defaultChecked={item.active} />
          Active (available to add to proposals)
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Save
        </button>
      </form>
    </div>
  );
}
