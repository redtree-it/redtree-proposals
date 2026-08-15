import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormTextarea, Notice } from "@/app/_components/FormField";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  EXPIRED: "bg-amber-50 text-amber-700",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { proposals: { orderBy: { updatedAt: "desc" } } },
  });
  if (!client) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/clients" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← All clients
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{client.name}</h1>

      {error && <Notice kind="error" message={error} />}
      {saved && <Notice kind="success" message="Client saved." />}

      <form action={`/api/clients/${client.id}`} method="POST" className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" name="name" required defaultValue={client.name} />
          <FormField label="Sector" name="sector" defaultValue={client.sector ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Contact name" name="contactName" defaultValue={client.contactName ?? ""} />
          <FormField label="Contact email" name="email" type="email" defaultValue={client.email ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="User count"
            name="userCount"
            type="number"
            defaultValue={client.userCount ?? undefined}
          />
          <FormField
            label="Device count"
            name="deviceCount"
            type="number"
            defaultValue={client.deviceCount ?? undefined}
          />
        </div>
        <FormTextarea label="Notes" name="notes" defaultValue={client.notes ?? ""} />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Save changes
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Proposals</h2>
      <div className="mt-3 space-y-2">
        {client.proposals.map((proposal) => (
          <Link
            key={proposal.id}
            href={`/proposals/${proposal.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm hover:border-neutral-300"
          >
            <span className="font-medium text-neutral-900">{proposal.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proposal.status]}`}>
              {proposal.status}
            </span>
          </Link>
        ))}
        {client.proposals.length === 0 && (
          <p className="text-sm text-neutral-400">No proposals yet for this client.</p>
        )}
      </div>
    </div>
  );
}
