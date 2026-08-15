import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { buildProposalDocx } from "./buildProposalDocx";
import { isWellFormedXml } from "./validateXml";

const COMPANY = {
  name: "Redtree IT Limited",
  addressLine: "Ashwood House / 66 Cardiff Road / Glan Y Llyn / Taffs Well / Cardiff / CF15 7QE",
  phone: "029 2009 0015",
  email: "info@redtree-it.co.uk",
  website: "redtree-it.co.uk",
};

test("buildProposalDocx produces a well-formed, valid .docx with no leftover merge tokens", async () => {
  const buffer = await buildProposalDocx({
    clientName: "Beacons Cymru",
    proposalTitle: "Managed IT Proposal",
    validUntilLabel: "15/09/2026",
    whatWeHeard: "We spoke with Luke about their needs.\n\n- Move to Microsoft\n- Improve security",
    recommendation: "We recommend **Microsoft 365 Business Premium** for all users.",
    requirements: [{ requirement: "Move to Microsoft ecosystem", delivery: "Migrate to M365 Business Premium" }],
    blocks: [
      { title: "Unlimited Support", bodyMarkdown: "We support Beacons Cymru without limits.\n\n- No caps\n- No surprises" },
      { title: "Our Values", bodyMarkdown: "We are **open and transparent** in everything we do." },
    ],
    coreLines: [
      { name: "IT Support Services", description: "Unlimited remote support", unitPricePence: 3500, quantity: 12, optional: false },
    ],
    phase2Lines: [{ name: "Managed EDR", unitPricePence: 941, quantity: 2, optional: true }],
    coreTotalPence: 42000,
    vatNote: "All prices exclude VAT and are collected on due date by direct debit",
    logo: null,
    company: COMPANY,
  });

  // Starts with the ZIP magic number — a real OOXML package, not garbage bytes.
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);

  const zip = await JSZip.loadAsync(buffer);

  assert.ok(zip.file("[Content_Types].xml"), "missing [Content_Types].xml");
  assert.ok(zip.file("word/document.xml"), "missing word/document.xml");

  const xmlFiles = Object.keys(zip.files).filter((name) => name.endsWith(".xml") && !zip.files[name].dir);
  for (const name of xmlFiles) {
    const content = await zip.file(name)!.async("string");
    assert.ok(isWellFormedXml(content), `${name} is not well-formed XML`);
  }

  const documentXml = await zip.file("word/document.xml")!.async("string");
  assert.doesNotMatch(documentXml, /\{\{\w+\}\}/, "exported document must not contain unresolved merge tokens");
  assert.match(documentXml, /Beacons Cymru/);
  assert.match(documentXml, /Managed EDR/);
});

test("buildProposalDocx embeds the logo image when one is provided", async () => {
  // A 1x1 transparent PNG, just enough for readPngDimensions to parse.
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const buffer = await buildProposalDocx({
    clientName: "Acme",
    proposalTitle: "Proposal",
    validUntilLabel: "01/01/2027",
    whatWeHeard: null,
    recommendation: null,
    requirements: [],
    blocks: [],
    coreLines: [],
    phase2Lines: [],
    coreTotalPence: 0,
    vatNote: "Excludes VAT",
    logo: { buffer: Buffer.from(pngBase64, "base64"), extension: "png" },
    company: COMPANY,
  });

  const zip = await JSZip.loadAsync(buffer);
  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith("word/media/"));
  assert.ok(mediaFiles.length > 0, "expected an embedded image under word/media/");
});
