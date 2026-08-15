import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Notice } from "@/app/_components/FormField";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  const [clients, templates] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.template.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-neutral-900">New Proposal</h1>

      {error && <Notice kind="error" message={error} />}

      <form action="/api/proposals" method="POST" className="mt-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
            Proposal title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="Managed IT Proposal"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-neutral-700">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          >
            <option value="">— New client —</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Leave as &ldquo;New client&rdquo; and fill in the name below to create one on the fly.
          </p>
        </div>

        <div>
          <label htmlFor="newClientName" className="block text-sm font-medium text-neutral-700">
            New client name
          </label>
          <input
            id="newClientName"
            name="newClientName"
            placeholder="Only needed if not selecting an existing client above"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <div>
          <label htmlFor="templateId" className="block text-sm font-medium text-neutral-700">
            Template
          </label>
          <select
            id="templateId"
            name="templateId"
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          >
            <option value="">— Blank proposal —</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Create proposal
        </button>
      </form>
    </div>
  );
}
