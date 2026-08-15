// A minimal well-formedness check (balanced tags) — the closest available
// substitute for "opens in Word without repair prompts" on a machine with no
// LibreOffice/Word to actually render the file.
export function isWellFormedXml(xml: string): boolean {
  const tagRegex = /<\/?([a-zA-Z0-9:_-]+)(?:\s[^>]*)?\/?>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    const full = match[0];
    const name = match[1];
    if (full.startsWith("<?") || full.startsWith("<!--")) continue;
    if (full.endsWith("/>")) continue; // self-closing
    if (full.startsWith("</")) {
      const last = stack.pop();
      if (last !== name) return false;
    } else {
      stack.push(name);
    }
  }

  return stack.length === 0;
}
