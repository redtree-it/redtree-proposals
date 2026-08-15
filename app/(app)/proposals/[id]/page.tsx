import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Notice } from "@/app/_components/FormField";
import { MarkdownPreview } from "@/lib/markdown/renderReact";
import { computeTotals } from "@/lib/pricing";
import {
  formatPence,
  penceToPoundsString,
  PRICE_CATEGORY_LABELS,
  UNIT_TYPE_LABELS,
  UNIT_TYPES,
} from "@/lib/validation/price-book";
import { PROPOSAL_STATUSES } from "@/lib/validation/proposal";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  EXPIRED: "bg-amber-50 text-amber-700",
};

function dateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ProposalBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: true,
      blocks: { orderBy: { sortOrder: "asc" } },
      requirements: { orderBy: { sortOrder: "asc" } },
      pricingLines: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: true }, take: 20 },
    },
  });
  if (!proposal) notFound();

  const [includedBlocks, priceBookItems] = await Promise.all([
    prisma.contentBlock.findMany({
      where: { active: true, id: { notIn: proposal.blocks.map((b) => b.sourceBlockId).filter((x): x is string => !!x) } },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.priceBookItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
  ]);

  const totals = computeTotals(proposal.pricingLines);
  const coreLines = proposal.pricingLines.filter((l) => l.category === "CORE");
  const phase2Lines = proposal.pricingLines.filter((l) => l.category === "PHASE_2");

  return (
    <div className="max-w-4xl">
      <Link href="/proposals" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← All proposals
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{proposal.title}</h1>
          <p className="text-sm text-neutral-500">
            <Link href={`/clients/${proposal.client.id}`} className="hover:underline">
              {proposal.client.name}
            </Link>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proposal.status]}`}>
              {proposal.status}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/proposals/${proposal.id}/preview`}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Preview & Export
          </Link>
          <form action={`/api/proposals/${proposal.id}/duplicate`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Duplicate
            </button>
          </form>
        </div>
      </div>

      {error && <Notice kind="error" message={error} />}
      {saved && <Notice kind="success" message="Saved." />}

      {/* Settings */}
      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Settings</h2>
        <form action={`/api/proposals/${proposal.id}`} method="POST" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                defaultValue={proposal.title}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-neutral-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={proposal.status}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {PROPOSAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="validUntil" className="block text-sm font-medium text-neutral-700">
                Valid until
              </label>
              <input
                id="validUntil"
                name="validUntil"
                type="date"
                defaultValue={dateInputValue(proposal.validUntil)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
          </div>
          <div>
            <label htmlFor="whatWeHeard" className="block text-sm font-medium text-neutral-700">
              What we heard
            </label>
            <textarea
              id="whatWeHeard"
              name="whatWeHeard"
              rows={3}
              defaultValue={proposal.whatWeHeard ?? ""}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label htmlFor="recommendation" className="block text-sm font-medium text-neutral-700">
              Our recommendation
            </label>
            <textarea
              id="recommendation"
              name="recommendation"
              rows={3}
              defaultValue={proposal.recommendation ?? ""}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label htmlFor="vatNoteOverride" className="block text-sm font-medium text-neutral-700">
              VAT note override (optional)
            </label>
            <input
              id="vatNoteOverride"
              name="vatNoteOverride"
              defaultValue={proposal.vatNoteOverride ?? ""}
              placeholder="Leave blank to use the company default"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            Save settings
          </button>
        </form>
      </section>

      {/* Requirements */}
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Requirements → Delivery</h2>
        <div className="mt-4 space-y-2">
          {proposal.requirements.map((req) => (
            <form
              key={req.id}
              action={`/api/proposals/${proposal.id}/requirements/${req.id}`}
              method="POST"
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <input
                name="requirement"
                defaultValue={req.requirement}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <input
                name="delivery"
                defaultValue={req.delivery}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <div className="flex gap-1">
                <button type="submit" className="rounded px-2 py-1 text-xs font-medium text-brand-green-dark hover:bg-green-50">
                  Save
                </button>
                <button
                  type="submit"
                  name="action"
                  value="delete"
                  formNoValidate
                  className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </form>
          ))}
        </div>
        <form action={`/api/proposals/${proposal.id}/requirements`} method="POST" className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            name="requirement"
            placeholder="Requirement"
            required
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <input
            name="delivery"
            placeholder="How we'll deliver it"
            required
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button type="submit" className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
            Add
          </button>
        </form>
      </section>

      {/* Blocks */}
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Content Blocks</h2>
        <div className="mt-4 space-y-3">
          {proposal.blocks.map((block, index) => (
            <details key={block.id} className="rounded-md border border-neutral-200">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-neutral-900">
                  {block.title}
                  {block.overridden && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Overridden
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-400">#{index + 1}</span>
              </summary>
              <div className="border-t border-neutral-200 p-4">
                <MarkdownPreview markdown={block.bodyMarkdown} className="mb-4 text-sm text-neutral-700" />
                <form action={`/api/proposals/${proposal.id}/blocks/${block.id}`} method="POST" className="space-y-2">
                  <input type="hidden" name="action" value="save" />
                  <input
                    name="title"
                    defaultValue={block.title}
                    className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                  <textarea
                    name="bodyMarkdown"
                    rows={5}
                    defaultValue={block.bodyMarkdown}
                    className="block w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                  <div className="flex items-center justify-between">
                    <button type="submit" className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-dark">
                      Save changes
                    </button>
                    <div className="flex gap-1">
                      <SmallActionForm proposalId={proposal.id} blockId={block.id} action="move_up" label="↑" disabled={index === 0} />
                      <SmallActionForm
                        proposalId={proposal.id}
                        blockId={block.id}
                        action="move_down"
                        label="↓"
                        disabled={index === proposal.blocks.length - 1}
                      />
                      <SmallActionForm proposalId={proposal.id} blockId={block.id} action="remove" label="Remove" danger />
                    </div>
                  </div>
                </form>
              </div>
            </details>
          ))}
          {proposal.blocks.length === 0 && <p className="text-sm text-neutral-400">No blocks added yet.</p>}
        </div>

        {includedBlocks.length > 0 && (
          <form action={`/api/proposals/${proposal.id}/blocks`} method="POST" className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="blockId" className="block text-sm font-medium text-neutral-700">
                Add block from library
              </label>
              <select
                id="blockId"
                name="blockId"
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {includedBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
              Add
            </button>
          </form>
        )}
      </section>

      {/* Pricing */}
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Pricing</h2>
        <p className="mt-1 text-xs text-neutral-400">All prices exclude VAT.</p>

        <PricingTable proposalId={proposal.id} title="Core" lines={coreLines} totalPence={totals.coreIncludedPence} optionalTotalPence={totals.coreOptionalPence} />
        <PricingTable proposalId={proposal.id} title={PRICE_CATEGORY_LABELS.PHASE_2} lines={phase2Lines} totalPence={totals.phase2Pence} />

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-md bg-neutral-50 p-3 text-sm">
          <div>
            <span className="font-medium text-neutral-900">{formatPence(totals.coreIncludedPence)}</span>
            <span className="ml-1 text-neutral-500">/ month core</span>
          </div>
          {totals.coreOptionalPence > 0 && (
            <div>
              <span className="font-medium text-neutral-900">{formatPence(totals.coreOptionalPence)}</span>
              <span className="ml-1 text-neutral-500">/ month optional</span>
            </div>
          )}
          {totals.phase2Pence > 0 && (
            <div>
              <span className="font-medium text-neutral-900">{formatPence(totals.phase2Pence)}</span>
              <span className="ml-1 text-neutral-500">/ month phase 2</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-4">
          {priceBookItems.length > 0 && (
            <form action={`/api/proposals/${proposal.id}/pricing`} method="POST" className="space-y-2">
              <input type="hidden" name="source" value="book" />
              <label className="block text-xs font-medium text-neutral-700">Add from price book</label>
              <select
                name="priceBookItemId"
                className="block w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {priceBookItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatPence(item.unitPricePence)} {UNIT_TYPE_LABELS[item.unitType]})
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="block w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <button type="submit" className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
                Add
              </button>
            </form>
          )}

          <form action={`/api/proposals/${proposal.id}/pricing`} method="POST" className="space-y-2">
            <input type="hidden" name="source" value="custom" />
            <label className="block text-xs font-medium text-neutral-700">Add custom line</label>
            <input
              name="name"
              placeholder="Name"
              required
              className="block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <div className="flex gap-2">
              <input
                name="unitPricePounds"
                type="number"
                step="0.01"
                placeholder="£"
                defaultValue="0.00"
                className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <select
                name="unitType"
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {UNIT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className="w-16 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>
            <div className="flex items-center justify-between">
              <select
                name="category"
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                <option value="CORE">Core</option>
                <option value="PHASE_2">Phase 2</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                <input type="checkbox" name="optional" /> Optional
              </label>
            </div>
            <button type="submit" className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200">
              Add
            </button>
          </form>
        </div>
      </section>

      {/* Activity log */}
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Activity</h2>
        <ul className="mt-3 space-y-1 text-xs text-neutral-500">
          {proposal.activities.map((a) => (
            <li key={a.id}>
              {a.createdAt.toLocaleString("en-GB")} — {a.user.name} — {a.action}
              {a.detail ? `: ${a.detail}` : ""}
            </li>
          ))}
          {proposal.activities.length === 0 && <li>No activity yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function SmallActionForm({
  proposalId,
  blockId,
  action,
  label,
  disabled,
  danger,
}: {
  proposalId: string;
  blockId: string;
  action: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={`/api/proposals/${proposalId}/blocks/${blockId}`} method="POST">
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        disabled={disabled}
        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-30 ${
          danger ? "text-red-500 hover:bg-red-50" : "text-neutral-500 hover:bg-neutral-100"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function PricingTable({
  proposalId,
  title,
  lines,
  totalPence,
  optionalTotalPence,
}: {
  proposalId: string;
  title: string;
  lines: {
    id: string;
    name: string;
    description: string | null;
    unitPricePence: number;
    unitType: (typeof UNIT_TYPES)[number];
    quantity: number;
    optional: boolean;
  }[];
  totalPence: number;
  optionalTotalPence?: number;
}) {
  if (lines.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-1.5 font-medium">Item</th>
            <th className="py-1.5 font-medium">Unit price</th>
            <th className="py-1.5 font-medium">Qty</th>
            <th className="py-1.5 font-medium">Total</th>
            <th className="py-1.5 font-medium">Optional</th>
            <th className="py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-100">
              <td className="py-2 pr-2">
                <div className="font-medium text-neutral-900">{line.name}</div>
                {line.description && <div className="text-xs text-neutral-400">{line.description}</div>}
              </td>
              <td className="py-2">
                <form
                  id={`line-${line.id}`}
                  action={`/api/proposals/${proposalId}/pricing/${line.id}`}
                  method="POST"
                  className="flex items-center gap-1"
                >
                  £
                  <input
                    name="unitPricePounds"
                    type="number"
                    step="0.01"
                    defaultValue={penceToPoundsString(line.unitPricePence)}
                    className="w-20 rounded border border-neutral-300 px-1.5 py-1 text-sm"
                  />
                </form>
              </td>
              <td className="py-2">
                <input
                  form={`line-${line.id}`}
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={line.quantity}
                  className="w-14 rounded border border-neutral-300 px-1.5 py-1 text-sm"
                />
              </td>
              <td className="py-2 font-medium text-neutral-900">{formatPence(line.unitPricePence * line.quantity)}</td>
              <td className="py-2">
                <input form={`line-${line.id}`} type="checkbox" name="optional" defaultChecked={line.optional} />
              </td>
              <td className="py-2">
                <button form={`line-${line.id}`} type="submit" className="rounded px-2 py-1 text-xs font-medium text-brand-green-dark hover:bg-green-50">
                  Save
                </button>
                <form action={`/api/proposals/${proposalId}/pricing/${line.id}`} method="POST" className="inline">
                  <input type="hidden" name="action" value="delete" />
                  <button type="submit" className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-right text-xs text-neutral-500">
        Total: <span className="font-medium text-neutral-900">{formatPence(totalPence)}</span>
        {optionalTotalPence ? (
          <span className="ml-2 text-neutral-400">
            (+ {formatPence(optionalTotalPence)} optional)
          </span>
        ) : null}
      </p>
    </div>
  );
}
