import { Paragraph, TextRun } from "docx";
import { parseInline, parseMarkdownBlocks } from "./parse";

const BODY_FONT = "Aago Rg";
const BODY_COLOR = "000000";

function inlineRuns(text: string): TextRun[] {
  return parseInline(text).map(
    (segment) =>
      new TextRun({
        text: segment.text,
        bold: segment.bold,
        font: BODY_FONT,
        color: BODY_COLOR,
      })
  );
}

// Mirrors lib/markdown/renderReact.tsx so the Word export matches the
// on-screen preview: paragraphs, **bold**, and "- " bullet lines only.
export function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const blocks = parseMarkdownBlocks(markdown);
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      paragraphs.push(new Paragraph({ children: inlineRuns(block.text), spacing: { after: 160 } }));
    } else {
      for (const item of block.items) {
        paragraphs.push(
          new Paragraph({ children: inlineRuns(item), bullet: { level: 0 }, spacing: { after: 80 } })
        );
      }
    }
  }

  return paragraphs;
}
