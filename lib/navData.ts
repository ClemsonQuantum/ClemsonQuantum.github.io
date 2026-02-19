import { getAllPages, sortPages, PageMeta } from './content';

export interface NavData {
  hackathons: PageMeta[];
  workshops: PageMeta[];
}

export function getNavData(): NavData {
  const hackathons = sortPages(getAllPages('events/hackathons'));
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));
  return { hackathons, workshops };
}
