import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Notice } from "@/app/_components/FormField";
import { CATEGORY_LABELS } from "@/lib/validation/block";

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      blocks: {
        orderBy: { sortOrder: "asc" },
        include: { block: { include: { currentVersion: true } } },
      },
    },
  });
  if (!template) notFound();

  const includedBlockIds = new Set(template.blocks.map((tb) => tb.blockId));
  const availableBlocks = await prisma.contentBlock.findMany({
    where: { active: true, id: { notIn: [...includedBlockIds] } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="max-w-3xl">
      <Link href="/templates" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← All templates
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{template.name}</h1>
      {template.description && <p className="mt-1 text-sm text-neutral-500">{template.description}</p>}

      {error && <Notice kind="error" message={error} />}

      <div className="mt-6 space-y-2">
        {template.blocks.map((tb, index) => (
          <div
            key={tb.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium text-neutral-900">{tb.block.title}</span>
              <span className="ml-2 text-xs text-neutral-400">{CATEGORY_LABELS[tb.block.category]}</span>
            </div>
            <div className="flex items-center gap-1">
              <form action={`/api/templates/${template.id}/blocks/${tb.id}`} method="POST">
                <input type="hidden" name="action" value="move_up" />
                <button
                  type="submit"
                  disabled={index === 0}
                  className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
              </form>
              <form action={`/api/templates/${template.id}/blocks/${tb.id}`} method="POST">
                <input type="hidden" name="action" value="move_down" />
                <button
                  type="submit"
                  disabled={index === template.blocks.length - 1}
                  className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </form>
              <form action={`/api/templates/${template.id}/blocks/${tb.id}`} method="POST">
                <input type="hidden" name="action" value="remove" />
                <button type="submit" className="rounded px-2 py-1 text-red-500 hover:bg-red-50">
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
        {template.blocks.length === 0 && (
          <p className="text-sm text-neutral-400">No blocks in this template yet.</p>
        )}
      </div>

      {availableBlocks.length > 0 && (
        <form
          action={`/api/templates/${template.id}/blocks`}
          method="POST"
          className="mt-6 flex items-end gap-3"
        >
          <div className="flex-1">
            <label htmlFor="blockId" className="block text-sm font-medium text-neutral-700">
              Add block
            </label>
            <select
              id="blockId"
              name="blockId"
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              {availableBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.title} ({CATEGORY_LABELS[block.category]})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
