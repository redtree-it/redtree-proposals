import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormSelect, Notice } from "@/app/_components/FormField";
import { BLOCK_CATEGORIES, CATEGORY_LABELS } from "@/lib/validation/block";
import { MarkdownPreview } from "@/lib/markdown/renderReact";

export default async function BlockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const block = await prisma.contentBlock.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      versions: { orderBy: { versionNo: "desc" }, include: { createdBy: true } },
    },
  });
  if (!block) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/blocks" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← All blocks
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{block.title}</h1>

      {error && <Notice kind="error" message={error} />}
      {saved && <Notice kind="success" message="Block saved." />}

      <form action={`/api/blocks/${block.id}`} method="POST" className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title" name="title" required defaultValue={block.title} />
          <FormSelect
            label="Category"
            name="category"
            defaultValue={block.category}
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
            rows={8}
            required
            defaultValue={block.currentVersion?.bodyMarkdown ?? ""}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="active" defaultChecked={block.active} />
          Active (available to add to proposals)
        </label>
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Save
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold text-neutral-700">Preview</h2>
      <div className="mt-2 rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-800">
        <MarkdownPreview markdown={block.currentVersion?.bodyMarkdown ?? ""} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Version history</h2>
      <div className="mt-3 space-y-2">
        {block.versions.map((version) => (
          <div key={version.id} className="rounded-md border border-neutral-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                v{version.versionNo}
                {version.id === block.currentVersionId && (
                  <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-green-700">Current</span>
                )}
              </span>
              <span>
                {version.createdBy.name} · {version.createdAt.toLocaleDateString("en-GB")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-neutral-600">{version.bodyMarkdown}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
