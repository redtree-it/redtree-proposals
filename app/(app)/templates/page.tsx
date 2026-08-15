import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormTextarea, Notice } from "@/app/_components/FormField";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const [templates, { error }] = await Promise.all([
    prisma.template.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { blocks: true, proposals: true } } },
    }),
    searchParams,
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Templates</h1>

      <div className="mt-6 space-y-2">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/templates/${template.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm hover:border-neutral-300"
          >
            <div>
              <span className="font-medium text-neutral-900">{template.name}</span>
              {!template.active && (
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  Archived
                </span>
              )}
              {template.description && (
                <p className="mt-0.5 text-xs text-neutral-500">{template.description}</p>
              )}
            </div>
            <span className="text-xs text-neutral-400">{template._count.blocks} blocks</span>
          </Link>
        ))}
        {templates.length === 0 && <p className="text-sm text-neutral-400">No templates yet.</p>}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Add template</h2>
      {error && <Notice kind="error" message={error} />}

      <form action="/api/templates" method="POST" className="mt-4 max-w-2xl space-y-4">
        <FormField label="Name" name="name" required />
        <FormTextarea label="Description" name="description" rows={2} />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Add template
        </button>
      </form>
    </div>
  );
}
