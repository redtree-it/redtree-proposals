import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMergeFields, resolveMergeFields, validateProposal } from "./merge-fields";

test("resolveMergeFields includes client_name and date unconditionally", () => {
  const fields = resolveMergeFields({ name: "Beacons Cymru", contactName: null, userCount: null }, { validUntil: null });
  assert.equal(fields.client_name, "Beacons Cymru");
  assert.ok(fields.date);
  assert.equal(fields.contact_first_name, undefined);
  assert.equal(fields.user_count, undefined);
  assert.equal(fields.valid_until, undefined);
});

test("resolveMergeFields takes only the first name from contactName", () => {
  const fields = resolveMergeFields({ name: "Acme", contactName: "Luke Smith", userCount: null }, { validUntil: null });
  assert.equal(fields.contact_first_name, "Luke");
});

test("resolveMergeFields includes user_count and valid_until when present", () => {
  const fields = resolveMergeFields(
    { name: "Acme", contactName: null, userCount: 12 },
    { validUntil: new Date("2026-09-15") }
  );
  assert.equal(fields.user_count, "12");
  assert.equal(fields.valid_until, "15/09/2026");
});

test("applyMergeFields substitutes known tokens and reports unknown ones as unresolved", () => {
  const result = applyMergeFields("Hi {{contact_first_name}}, welcome {{client_name}}. {{missing}}", {
    contact_first_name: "Luke",
    client_name: "Acme",
  });
  assert.equal(result.resolved, "Hi Luke, welcome Acme. {{missing}}");
  assert.deepEqual(result.unresolved, ["missing"]);
});

test("applyMergeFields returns no unresolved tokens for plain text", () => {
  const result = applyMergeFields("No tokens here.", {});
  assert.equal(result.resolved, "No tokens here.");
  assert.deepEqual(result.unresolved, []);
});

test("validateProposal flags every unresolved token across all text sources, deduplicated", () => {
  const issues = validateProposal(
    {
      whatWeHeard: "Hi {{missing_a}}.",
      recommendation: null,
      blocks: [{ title: "Intro", bodyMarkdown: "{{missing_a}} and {{missing_b}}." }],
      requirements: [],
    },
    {},
    []
  );
  const unresolvedIssue = issues.find((i) => i.type === "unresolved_field");
  assert.ok(unresolvedIssue);
  assert.match(unresolvedIssue!.message, /\{\{missing_a\}\}/);
  assert.match(unresolvedIssue!.message, /\{\{missing_b\}\}/);
});

test("validateProposal returns no issues when everything resolves and no name mismatch exists", () => {
  const issues = validateProposal(
    {
      whatWeHeard: "Hi {{client_name}}.",
      recommendation: null,
      blocks: [],
      requirements: [],
    },
    { client_name: "Beacons Cymru" },
    ["Some Other Client"]
  );
  assert.deepEqual(issues, []);
});

test("validateProposal flags a different client's name appearing verbatim in resolved text — the copy-paste bug", () => {
  const issues = validateProposal(
    {
      whatWeHeard: "We spoke with NS Accounts about their needs.",
      recommendation: null,
      blocks: [],
      requirements: [],
    },
    {},
    ["NS Accounts", "Another Co"]
  );
  const mismatch = issues.find((i) => i.type === "name_mismatch");
  assert.ok(mismatch);
  assert.match(mismatch!.message, /NS Accounts/);
});

test("validateProposal ignores very short other-client names to avoid false positives", () => {
  const issues = validateProposal(
    {
      whatWeHeard: "We use IT systems daily.",
      recommendation: null,
      blocks: [],
      requirements: [],
    },
    {},
    ["IT"]
  );
  assert.equal(issues.filter((i) => i.type === "name_mismatch").length, 0);
});

test("validateProposal checks requirement and delivery text too", () => {
  const issues = validateProposal(
    {
      whatWeHeard: null,
      recommendation: null,
      blocks: [],
      requirements: [{ requirement: "Move to {{missing}}", delivery: "Fine" }],
    },
    {},
    []
  );
  assert.ok(issues.some((i) => i.type === "unresolved_field"));
});
