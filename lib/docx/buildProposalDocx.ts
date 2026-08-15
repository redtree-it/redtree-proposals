import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
} from "docx";
import { markdownToDocxParagraphs } from "../markdown/renderDocxParagraphs";
import { readPngDimensions } from "./readPngDimensions";

const BRAND_GREEN = "19DB61";
const TOTAL_ROW_GREY = "D9D9D9";
const FONT = "Aago Rg";
const PAGE_WIDTH_DXA = 11906; // A4 portrait, docx default

export interface ProposalDocxPricingLine {
  name: string;
  description?: string | null;
  unitPricePence: number;
  quantity: number;
  optional: boolean;
}

export interface ProposalDocxLogo {
  buffer: Buffer;
  extension: "png" | "jpg";
}

export interface ProposalDocxInput {
  clientName: string;
  proposalTitle: string;
  validUntilLabel: string;
  whatWeHeard?: string | null;
  recommendation?: string | null;
  requirements: { requirement: string; delivery: string }[];
  blocks: { title: string; bodyMarkdown: string }[];
  coreLines: ProposalDocxPricingLine[];
  phase2Lines: ProposalDocxPricingLine[];
  coreTotalPence: number;
  vatNote: string;
  logo?: ProposalDocxLogo | null;
  company: { name: string; addressLine: string; phone: string; email: string; website: string };
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({ text, bold: true, allCaps: true, font: FONT, color: BRAND_GREEN, size: 32 }),
    ],
  });
}

function bodyText(text: string, options: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({ text, font: FONT, color: "000000", ...options });
}

function pricingTable(lines: ProposalDocxPricingLine[]): Table {
  const itemColWidth = Math.round(PAGE_WIDTH_DXA * 0.7);
  const priceColWidth = PAGE_WIDTH_DXA - itemColWidth;

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: itemColWidth, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: BRAND_GREEN, color: "auto" },
        children: [new Paragraph({ children: [bodyText("Item", { bold: true, color: "FFFFFF" })] })],
      }),
      new TableCell({
        width: { size: priceColWidth, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: BRAND_GREEN, color: "auto" },
        children: [new Paragraph({ children: [bodyText("Price per month", { bold: true, color: "FFFFFF" })] })],
      }),
    ],
  });

  const rows = lines.map(
    (line) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: itemColWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  bodyText(line.name, { bold: true }),
                  ...(line.optional ? [bodyText("  (optional)", { italics: true, color: "666666" })] : []),
                ],
              }),
              ...(line.description ? [new Paragraph({ children: [bodyText(line.description, { size: 18 })] })] : []),
            ],
          }),
          new TableCell({
            width: { size: priceColWidth, type: WidthType.DXA },
            children: [new Paragraph({ children: [bodyText(formatPence(line.unitPricePence * line.quantity))] })],
          }),
        ],
      })
  );

  return new Table({ width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA }, columnWidths: [itemColWidth, priceColWidth], rows: [headerRow, ...rows] });
}

function totalRow(label: string, amountPence: number): Table {
  const labelWidth = Math.round(PAGE_WIDTH_DXA * 0.7);
  const valueWidth = PAGE_WIDTH_DXA - labelWidth;
  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelWidth, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: TOTAL_ROW_GREY, color: "auto" },
            children: [new Paragraph({ children: [bodyText(label, { bold: true })] })],
          }),
          new TableCell({
            width: { size: valueWidth, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: TOTAL_ROW_GREY, color: "auto" },
            children: [new Paragraph({ children: [bodyText(formatPence(amountPence), { bold: true })] })],
          }),
        ],
      }),
    ],
  });
}

export async function buildProposalDocx(input: ProposalDocxInput): Promise<Buffer> {
  const body: (Paragraph | Table)[] = [];

  if (input.logo) {
    const dims = input.logo.extension === "png" ? readPngDimensions(input.logo.buffer) : null;
    const maxWidth = 110;
    const scale = dims ? maxWidth / dims.width : 1;
    const width = dims ? Math.round(dims.width * scale) : maxWidth;
    const height = dims ? Math.round(dims.height * scale) : maxWidth;

    body.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: input.logo.extension,
            data: input.logo.buffer,
            transformation: { width, height },
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  body.push(
    new Paragraph({
      children: [new TextRun({ text: "MANAGED IT PROPOSAL", font: FONT, size: 20, color: "666666" })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: input.clientName, bold: true, allCaps: true, font: FONT, color: BRAND_GREEN, size: 56 })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      children: [
        bodyText(`${input.proposalTitle} · Valid until ${input.validUntilLabel}`, { size: 20, color: "666666" }),
      ],
    })
  );

  if (input.whatWeHeard) {
    body.push(heading("What we heard"), ...markdownToDocxParagraphs(input.whatWeHeard));
  }
  if (input.recommendation) {
    body.push(heading("Our recommendation"), ...markdownToDocxParagraphs(input.recommendation));
  }

  if (input.requirements.length > 0) {
    body.push(heading("Requirements"));
    const colWidth = Math.round(PAGE_WIDTH_DXA / 2);
    body.push(
      new Table({
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [colWidth, colWidth],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                width: { size: colWidth, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: BRAND_GREEN, color: "auto" },
                children: [new Paragraph({ children: [bodyText("Requirement", { bold: true, color: "FFFFFF" })] })],
              }),
              new TableCell({
                width: { size: colWidth, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: BRAND_GREEN, color: "auto" },
                children: [new Paragraph({ children: [bodyText("How we'll deliver it", { bold: true, color: "FFFFFF" })] })],
              }),
            ],
          }),
          ...input.requirements.map(
            (req) =>
              new TableRow({
                children: [
                  new TableCell({ width: { size: colWidth, type: WidthType.DXA }, children: [new Paragraph({ children: [bodyText(req.requirement)] })] }),
                  new TableCell({ width: { size: colWidth, type: WidthType.DXA }, children: [new Paragraph({ children: [bodyText(req.delivery)] })] }),
                ],
              })
          ),
        ],
      })
    );
  }

  for (const block of input.blocks) {
    body.push(heading(block.title), ...markdownToDocxParagraphs(block.bodyMarkdown));
  }

  if (input.coreLines.length > 0 || input.phase2Lines.length > 0) {
    body.push(heading("Pricing"));
    if (input.coreLines.length > 0) {
      body.push(pricingTable(input.coreLines));
      body.push(new Paragraph({ spacing: { before: 120, after: 240 }, children: [] }));
      body.push(totalRow("Total per month", input.coreTotalPence));
    }
    if (input.phase2Lines.length > 0) {
      body.push(new Paragraph({ spacing: { before: 320, after: 120 }, children: [bodyText("Additional services (phase 2)", { bold: true })] }));
      body.push(pricingTable(input.phase2Lines));
    }
    body.push(new Paragraph({ spacing: { before: 200 }, children: [bodyText(input.vatNote, { italics: true, size: 18, color: "666666" })] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [bodyText(`${input.company.name} · Managed IT Proposal`, { size: 16, color: "999999" })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  bodyText(
                    `${input.company.addressLine} · ${input.company.phone} · ${input.company.email} · Page `,
                    { size: 16, color: "999999" }
                  ),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  const { Packer } = await import("docx");
  return Packer.toBuffer(doc);
}
