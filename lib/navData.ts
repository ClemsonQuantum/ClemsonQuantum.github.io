import { getSortedPages } from './content';
import type { PageMeta } from './types';

// How many entries each Events submenu lists before its "View all" link.
export const EVENTS_IN_DROPDOWN = 3;

// Only what the header renders: this rides in every page's RSC payload, so
// full PageMeta records (with excerpts) would add kilobytes to each page.
export interface NavItem {
  title: string;
  href: string;
  isExternal: boolean;
}

export interface NavCategory {
  items: NavItem[];
  /** More entries exist than the submenu shows: render its "View all" link. */
  hasMore: boolean;
}

export interface NavData {
  hackathons: NavCategory;
  workshops: NavCategory;
  meetings: NavCategory;
}

function category(pages: PageMeta[]): NavCategory {
  return {
    items: pages
      .slice(0, EVENTS_IN_DROPDOWN)
      .map(({ title, href, isExternal }) => ({ title, href, isExternal })),
    hasMore: pages.length > EVENTS_IN_DROPDOWN,
  };
}

export function getNavData(): NavData {
  return {
    hackathons: category(getSortedPages('events/hackathons')),
    workshops: category(getSortedPages('events/workshops-and-seminars')),
    meetings: category(getSortedPages('events/meetings')),
  };
}
