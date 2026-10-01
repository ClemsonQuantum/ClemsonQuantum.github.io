import type { Components } from 'react-markdown';
import MarkdownDiv from './MarkdownDiv';
import MarkdownLink from './MarkdownLink';
import MarkdownSpan from './MarkdownSpan';

// The react-markdown renderers for both event slug routes (hackathons and
// workshops-and-seminars), so both read the same marker classes (the qff-*
// ones are styled by qff.css, which only the workshops route loads). Pages that
// use no marker render as plain HTML; the widgets themselves load lazily
// (lazyWidgets.tsx), so registering them costs a page nothing.
export const EVENT_COMPONENTS: Components = {
  a: MarkdownLink,
  div: MarkdownDiv,
  span: MarkdownSpan,
};
