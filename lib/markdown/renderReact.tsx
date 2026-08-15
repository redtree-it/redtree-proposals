import { parseInline, parseMarkdownBlocks } from "./parse";

function InlineText({ text, fields }: { text: string; fields?: Record<string, string> }) {
  if (!fields) {
    return (
      <>
        {parseInline(text).map((segment, i) =>
          segment.bold ? <strong key={i}>{segment.text}</strong> : <span key={i}>{segment.text}</span>
        )}
      </>
    );
  }

  // With `fields` supplied, merge tokens are resolved (or highlighted red if
  // unresolved) before bold parsing runs on the surrounding plain-text segments.
  const tokenRegex = /\{\{(\w+)\}\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      parts.push(
        ...parseInline(plain).map((segment) =>
          segment.bold ? <strong key={key++}>{segment.text}</strong> : <span key={key++}>{segment.text}</span>
        )
      );
    }
    const token = match[1];
    if (token in fields) {
      parts.push(<span key={key++}>{fields[token]}</span>);
    } else {
      parts.push(
        <span key={key++} className="rounded bg-red-100 px-1 font-mono text-red-700">
          {match[0]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const plain = text.slice(lastIndex);
    parts.push(
      ...parseInline(plain).map((segment) =>
        segment.bold ? <strong key={key++}>{segment.text}</strong> : <span key={key++}>{segment.text}</span>
      )
    );
  }

  return <>{parts}</>;
}

export function MarkdownPreview({
  markdown,
  fields,
  className,
}: {
  markdown: string;
  fields?: Record<string, string>;
  className?: string;
}) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <p key={i} className="mb-3 last:mb-0">
            <InlineText text={block.text} fields={fields} />
          </p>
        ) : (
          <ul key={i} className="mb-3 list-disc pl-5 last:mb-0">
            {block.items.map((item, j) => (
              <li key={j}>
                <InlineText text={item} fields={fields} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
