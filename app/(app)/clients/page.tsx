import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FormField, FormTextarea, Notice } from "@/app/_components/FormField";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const [clients, { error }] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { proposals: true } } },
    }),
    searchParams,
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Clients</h1>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Contact</th>
            <th className="py-2 font-medium">Sector</th>
            <th className="py-2 font-medium">Users / Devices</th>
            <th className="py-2 font-medium">Proposals</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-neutral-100">
              <td className="py-2">
                <Link href={`/clients/${client.id}`} className="font-medium text-neutral-900 hover:underline">
                  {client.name}
                </Link>
              </td>
              <td className="py-2 text-neutral-600">
                {client.contactName ?? "—"}
                {client.email ? ` · ${client.email}` : ""}
              </td>
              <td className="py-2 text-neutral-600">{client.sector ?? "—"}</td>
              <td className="py-2 text-neutral-600">
                {client.userCount ?? "—"} / {client.deviceCount ?? "—"}
              </td>
              <td className="py-2 text-neutral-600">{client._count.proposals}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-400">
                No clients yet — add one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Add client</h2>
      {error && <Notice kind="error" message={error} />}

      <form action="/api/clients" method="POST" className="mt-4 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" name="name" required />
          <FormField label="Sector" name="sector" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Contact name" name="contactName" />
          <FormField label="Contact email" name="email" type="email" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="User count" name="userCount" type="number" />
          <FormField label="Device count" name="deviceCount" type="number" />
        </div>
        <FormTextarea label="Notes" name="notes" />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Add client
        </button>
      </form>
    </div>
  );
}
