const TOKEN_REGEX = /\{\{(\w+)\}\}/g;

export interface MergeFieldClient {
  name: string;
  contactName: string | null;
  userCount: number | null;
}

export interface MergeFieldProposal {
  validUntil: Date | null;
}

// Only fields with real data are included — a token whose source field is
// blank (e.g. {{contact_first_name}} with no contact on the client record)
// stays unresolved on purpose, so validateProposal() catches it rather than
// silently rendering "undefined" or an empty string into the document.
export function resolveMergeFields(client: MergeFieldClient, proposal: MergeFieldProposal): Record<string, string> {
  const fields: Record<string, string> = {
    client_name: client.name,
    date: new Date().toLocaleDateString("en-GB"),
  };
  if (client.contactName) {
    fields.contact_first_name = client.contactName.trim().split(/\s+/)[0];
  }
  if (client.userCount != null) {
    fields.user_count = String(client.userCount);
  }
  if (proposal.validUntil) {
    fields.valid_until = proposal.validUntil.toLocaleDateString("en-GB");
  }
  return fields;
}

export interface MergeFieldResult {
  resolved: string;
  unresolved: string[];
}

export function applyMergeFields(text: string, fields: Record<string, string>): MergeFieldResult {
  const unresolved = new Set<string>();
  const resolved = text.replace(TOKEN_REGEX, (match, key: string) => {
    if (key in fields) return fields[key];
    unresolved.add(key);
    return match;
  });
  return { resolved, unresolved: [...unresolved] };
}

export interface ValidationIssue {
  type: "unresolved_field" | "name_mismatch";
  message: string;
}

export interface ValidatableProposal {
  whatWeHeard: string | null;
  recommendation: string | null;
  blocks: { title: string; bodyMarkdown: string }[];
  requirements: { requirement: string; delivery: string }[];
}

interface TextSource {
  label: string;
  text: string;
}

function collectTextSources(proposal: ValidatableProposal): TextSource[] {
  const texts: TextSource[] = [];
  if (proposal.whatWeHeard) texts.push({ label: "What we heard", text: proposal.whatWeHeard });
  if (proposal.recommendation) texts.push({ label: "Our recommendation", text: proposal.recommendation });
  for (const block of proposal.blocks) texts.push({ label: block.title, text: block.bodyMarkdown });
  for (const req of proposal.requirements) {
    texts.push({ label: `Requirement "${req.requirement}"`, text: req.requirement });
    texts.push({ label: `Delivery for "${req.requirement}"`, text: req.delivery });
  }
  return texts;
}

// The real bug this app exists to prevent: text left over from a different
// client's proposal (typed by hand, not via merge fields) shipping in a new
// one. We can't stop someone typing a name, but we can flag it — any other
// client's name appearing verbatim in the resolved text is almost certainly
// a copy-paste leftover, not a coincidence.
export function validateProposal(
  proposal: ValidatableProposal,
  fields: Record<string, string>,
  otherClientNames: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const texts = collectTextSources(proposal);

  const unresolvedTokens = new Set<string>();
  for (const { text } of texts) {
    applyMergeFields(text, fields).unresolved.forEach((token) => unresolvedTokens.add(token));
  }
  if (unresolvedTokens.size > 0) {
    const list = [...unresolvedTokens].map((t) => `{{${t}}}`).join(", ");
    issues.push({
      type: "unresolved_field",
      message: `Unresolved merge field${unresolvedTokens.size > 1 ? "s" : ""}: ${list}`,
    });
  }

  const candidateNames = otherClientNames.map((n) => n.trim()).filter((n) => n.length > 2);
  for (const { label, text } of texts) {
    for (const otherName of candidateNames) {
      if (text.includes(otherName)) {
        issues.push({
          type: "name_mismatch",
          message: `${label} mentions "${otherName}", which is a different client — check for a copy-paste mistake.`,
        });
      }
    }
  }

  return issues;
}
