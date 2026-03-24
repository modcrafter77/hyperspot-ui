import type { Components } from "react-markdown";
import type { HTMLAttributes } from "react";

export const markdownComponents: Partial<Components> = {
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),

  thead: ({ children }) => (
    <thead className="border-b border-border/50 bg-primary/10">{children}</thead>
  ),

  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/30">{children}</tbody>
  ),

  tr: ({ children }) => (
    <tr className="transition-colors duration-150 hover:bg-muted/40">
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

  // react-markdown v10: `inline` prop removed; detect by absence of className
  code: ({ children, className, ...rest }) => {
    const isBlock = Boolean(className);
    if (!isBlock) {
      return (
        <code className="inline rounded border border-border/30 bg-muted/70 px-2 py-0.5 font-mono text-xs font-medium text-primary/90">
          {children}
        </code>
      );
    }
    return <code className={className} {...(rest as HTMLAttributes<HTMLElement>)}>{children}</code>;
  },

  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border/30 bg-muted/50 p-4 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-md border-l-4 border-primary/40 bg-muted/20 py-1 pl-4 pr-3 italic text-foreground/80">
      {children}
    </blockquote>
  ),

  h1: ({ children }) => (
    <h1 className="mb-3 mt-5 text-2xl font-bold tracking-tight text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-xl font-bold tracking-tight text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 text-lg font-semibold text-foreground/95">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-2 font-semibold text-foreground/90">{children}</h4>
  ),

  ul: ({ children }) => (
    <ul className="my-2 ml-5 list-disc space-y-1.5 text-foreground/90">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-5 list-decimal space-y-1.5 text-foreground/90">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  a: ({ children, href }) => (
    <a
      href={href}
      className="break-words text-primary underline transition-colors hover:text-primary/80 hover:underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  p: ({ children }) => (
    <p className="my-2 leading-relaxed text-foreground/90">{children}</p>
  ),

  hr: () => <hr className="my-4 border-border/30" />,

  img: ({ alt, src, title }) => (
    <img
      alt={alt}
      src={src}
      title={title}
      className="my-3 max-w-full rounded-lg border border-border/30"
    />
  ),

  del: ({ children }) => <del className="text-foreground/70 line-through">{children}</del>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};
