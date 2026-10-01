import type { ReactNode } from 'react';

/**
 * Split the props react-markdown hands a custom renderer (MarkdownDiv,
 * MarkdownSpan, MarkdownLink). Returns the class list, a `data(name)` reader
 * for `data-*` attributes (react-markdown passes them under their literal
 * names; the value comes back trimmed, or undefined when missing or blank),
 * and `rest` to spread onto a plain element. react-markdown's `node` prop is
 * dropped so it never reaches the DOM.
 */
export function markdownProps<P extends { node?: unknown; className?: string; children?: ReactNode }>(
  props: P,
) {
  const { node, className, children, ...rest } = props;
  void node;
  const classes = className?.split(/\s+/).filter(Boolean) ?? [];
  const data = (name: string): string | undefined => {
    const value = (rest as Record<string, unknown>)[`data-${name}`];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  };
  return { className, children, rest, classes, data };
}
