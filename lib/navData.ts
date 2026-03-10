import { getAllPages, sortPages, PageMeta } from './content';

export interface NavData {
  hackathons: PageMeta[];
  workshops: PageMeta[];
  meetings: PageMeta[];
}

export function getNavData(): NavData {
  const hackathons = sortPages(getAllPages('events/hackathons'));
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));
  const meetings = sortPages(getAllPages('events/meetings'));
  return { hackathons, workshops, meetings };
}
