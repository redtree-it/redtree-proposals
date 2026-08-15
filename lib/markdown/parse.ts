// Deliberately minimal markdown subset — paragraphs, **bold**, and "- " bullet
// lines — shared by the on-screen preview and the Word export so both render
// identically. Not a general markdown parser.

export type Block = { type: "paragraph"; text: string } | { type: "bullet_list"; items: string[] };

export type InlineSegment = { text: string; bold: boolean };

export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let bulletItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ").trim() });
      paragraphLines = [];
    }
  };
  const flushBullets = () => {
    if (bulletItems.length > 0) {
      blocks.push({ type: "bullet_list", items: bulletItems });
      bulletItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      flushParagraph();
      flushBullets();
    } else if (line.startsWith("- ")) {
      flushParagraph();
      bulletItems.push(line.slice(2).trim());
    } else {
      flushBullets();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushBullets();

  return blocks;
}

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }
  return segments.length > 0 ? segments : [{ text, bold: false }];
}
