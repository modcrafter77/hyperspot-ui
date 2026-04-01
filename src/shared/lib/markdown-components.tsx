import type { Components } from "react-markdown";

/**
 * Custom Markdown components for beautiful rendering
 * Optimized for dark mode with Tailwind CSS
 */

export const markdownComponents: Partial<Components> = {
  // Tables with beautiful styling
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),

  thead: ({ children }) => (
    <thead className="bg-primary/10 border-b border-border/50">{children}</thead>
  ),

  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/30">{children}</tbody>
  ),

  tr: ({ children }) => (
    <tr className="hover:bg-muted/40 transition-colors duration-150">
      {children}
    </tr>
  ),

  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-foreground/95">
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td className="px-4 py-2.5 text-foreground/85">{children}</td>
  ),

  // Code: react-markdown v10 removed the `inline` prop.
  // Both inline code and fenced code blocks without a language have className=undefined.
  // We distinguish them by checking for newlines in the content.
  code: ({ children, className }) => {
    const isBlock = Boolean(className) || String(children).includes("\n");
    if (!isBlock) {
      return (
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-foreground border border-border/50">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },

  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border/30 text-xs leading-relaxed [&>code.hljs]:rounded-lg [&>code.hljs]:p-4">
      {children}
    </pre>
  ),

  // Better typography
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-primary/40 pl-4 py-1 italic text-foreground/80 bg-muted/20 rounded-r-md pr-3">
      {children}
    </blockquote>
  ),

  h1: ({ children }) => (
    <h1 className="mt-5 mb-3 text-2xl font-bold text-foreground tracking-tight">
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-xl font-bold text-foreground tracking-tight">
      {children}
    </h2>
  ),

  h3: ({ children }) => (
    <h3 className="mt-3 mb-2 text-lg font-semibold text-foreground/95">
      {children}
    </h3>
  ),

  h4: ({ children }) => (
    <h4 className="mt-2 mb-1.5 font-semibold text-foreground/90">{children}</h4>
  ),

  h5: ({ children }) => (
    <h5 className="mt-2 mb-1.5 font-semibold text-foreground/90">{children}</h5>
  ),

  h6: ({ children }) => (
    <h6 className="mt-2 mb-1.5 font-semibold text-foreground/90">{children}</h6>
  ),

  // Lists with better spacing
  ul: ({ children }) => (
    <ul className="my-2 ml-5 space-y-1.5 list-disc text-foreground/90">
      {children}
    </ul>
  ),

  ol: ({ children }) => (
    <ol className="my-2 ml-5 space-y-1.5 list-decimal text-foreground/90">
      {children}
    </ol>
  ),

  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Links
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline hover:underline-offset-2 transition-colors break-words"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // Paragraphs with spacing
  p: ({ children }) => (
    <p className="my-2 leading-relaxed text-foreground/90">{children}</p>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-border/30" />,

  // Images
  img: ({ alt, src, title }) => (
    <img
      alt={alt}
      src={src}
      title={title}
      className="my-3 max-w-full rounded-lg border border-border/30"
    />
  ),

  // Strikethrough
  del: ({ children }) => (
    <del className="line-through text-foreground/70">{children}</del>
  ),

  // Strong
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,

  // Emphasis
  em: ({ children }) => <em className="italic">{children}</em>,
};
