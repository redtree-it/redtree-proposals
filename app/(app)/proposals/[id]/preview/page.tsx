import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getResolvedProposal } from "@/lib/proposal-validation";
import { MarkdownPreview } from "@/lib/markdown/renderReact";
import { computeTotals } from "@/lib/pricing";
import { formatPence } from "@/lib/validation/price-book";
import { Notice } from "@/app/_components/FormField";

export default async function ProposalPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const data = await getResolvedProposal(id);
  if (!data) notFound();
  const { proposal, settings, fields, issues } = data;

  const totals = computeTotals(proposal.pricingLines);
  const coreLines = proposal.pricingLines.filter((l) => l.category === "CORE");
  const phase2Lines = proposal.pricingLines.filter((l) => l.category === "PHASE_2");
  const vatNote = proposal.vatNoteOverride || settings.vatNoteText;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href={`/proposals/${proposal.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to builder
        </Link>
        <Link href={`/proposals/${proposal.id}/exports`} className="text-sm text-neutral-500 hover:text-neutral-900">
          Export history →
        </Link>
      </div>

      {error && <Notice kind="error" message={error} />}

      {issues.length > 0 ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Export is blocked</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {issues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <form action={`/api/proposals/${proposal.id}/export`} method="POST" className="mt-6">
          <button
            type="submit"
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            Export .docx
          </button>
        </form>
      )}

      {/* Document preview */}
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-10 shadow-sm">
        {settings.logoPath && (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own /uploads route
          <img src={`/uploads/${settings.logoPath}`} alt="Logo" className="mb-6 h-12 object-contain" />
        )}
        <p className="text-xs uppercase tracking-wide text-neutral-400">Managed IT Proposal</p>
        <h1 className="mt-1 text-3xl font-bold text-neutral-900">{fields.client_name ?? proposal.client.name}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {proposal.title} · Valid until {fields.valid_until ?? "—"}
        </p>

        {proposal.whatWeHeard && (
          <Section title="What we heard">
            <MarkdownPreview markdown={proposal.whatWeHeard} fields={fields} className="text-sm text-neutral-800" />
          </Section>
        )}

        {proposal.recommendation && (
          <Section title="Our recommendation">
            <MarkdownPreview markdown={proposal.recommendation} fields={fields} className="text-sm text-neutral-800" />
          </Section>
        )}

        {proposal.requirements.length > 0 && (
          <Section title="Requirements">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-1.5 font-medium">Requirement</th>
                  <th className="py-1.5 font-medium">How we&rsquo;ll deliver it</th>
                </tr>
              </thead>
              <tbody>
                {proposal.requirements.map((req) => (
                  <tr key={req.id} className="border-b border-neutral-100 align-top">
                    <td className="py-2 pr-4">
                      <MarkdownPreview markdown={req.requirement} fields={fields} />
                    </td>
                    <td className="py-2">
                      <MarkdownPreview markdown={req.delivery} fields={fields} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {proposal.blocks.map((block) => (
          <Section key={block.id} title={block.title}>
            <MarkdownPreview markdown={block.bodyMarkdown} fields={fields} className="text-sm text-neutral-800" />
          </Section>
        ))}

        {proposal.pricingLines.length > 0 && (
          <Section title="Pricing">
            {coreLines.length > 0 && <PricingPreviewTable lines={coreLines} />}
            {phase2Lines.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Additional services (phase 2)
                </p>
                <PricingPreviewTable lines={phase2Lines} />
              </>
            )}
            <p className="mt-3 text-right text-sm font-semibold text-neutral-900">
              Total per month: {formatPence(totals.coreIncludedPence)}
            </p>
            <p className="mt-1 text-xs text-neutral-400">{vatNote}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-neutral-100 pt-6">
      <h2 className="text-lg font-bold text-brand-green-dark">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function PricingPreviewTable({
  lines,
}: {
  lines: { id: string; name: string; unitPricePence: number; quantity: number; optional: boolean }[];
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-brand-green text-left text-white">
          <th className="px-2 py-1.5 font-medium">Item</th>
          <th className="px-2 py-1.5 font-medium">Price per month</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.id} className="border-b border-neutral-100">
            <td className="px-2 py-2 text-neutral-800">
              {line.name}
              {line.optional && <span className="ml-2 text-xs text-neutral-400">(optional)</span>}
            </td>
            <td className="px-2 py-2 text-neutral-800">{formatPence(line.unitPricePence * line.quantity)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
