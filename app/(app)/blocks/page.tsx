import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormSelect, Notice } from "@/app/_components/FormField";
import { BLOCK_CATEGORIES, CATEGORY_LABELS } from "@/lib/validation/block";

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string }>;
}) {
  await requireUser();
  const { category, error } = await searchParams;

  const blocks = await prisma.contentBlock.findMany({
    where: category ? { category: category as (typeof BLOCK_CATEGORIES)[number] } : undefined,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: { currentVersion: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Content Blocks</h1>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/blocks"
          className={`rounded-full px-3 py-1 ${!category ? "bg-brand-green text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          All
        </Link>
        {BLOCK_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/blocks?category=${cat}`}
            className={`rounded-full px-3 py-1 ${category === cat ? "bg-brand-green text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {blocks.map((block) => (
          <Link
            key={block.id}
            href={`/blocks/${block.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm hover:border-neutral-300"
          >
            <div>
              <span className="font-medium text-neutral-900">{block.title}</span>
              <span className="ml-2 text-xs text-neutral-400">{CATEGORY_LABELS[block.category]}</span>
              {!block.active && (
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Archived
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-400">v{block.currentVersion?.versionNo ?? 1}</span>
          </Link>
        ))}
        {blocks.length === 0 && <p className="text-sm text-neutral-400">No blocks yet.</p>}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Add block</h2>
      {error && <Notice kind="error" message={error} />}

      <form action="/api/blocks" method="POST" className="mt-4 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title" name="title" required />
          <FormSelect
            label="Category"
            name="category"
            options={BLOCK_CATEGORIES.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] }))}
          />
        </div>
        <div>
          <label htmlFor="bodyMarkdown" className="block text-sm font-medium text-neutral-700">
            Body
          </label>
          <textarea
            id="bodyMarkdown"
            name="bodyMarkdown"
            rows={6}
            required
            placeholder={"Paragraphs, **bold**, and\n- bullet\n- points"}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Add block
        </button>
      </form>
    </div>
  );
}
