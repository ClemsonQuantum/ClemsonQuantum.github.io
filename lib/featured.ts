import { getPageBySlug } from './content';
import { hiddenAsDraft, isUnlisted, normalizeDate } from './content-shared.mjs';
import { formatDate, todayInClemson } from './dates.mjs';
import type { PageMeta } from './types';

/**
 * The event in the homepage's featured band (app/page.tsx). Point it at the
 * next event to feature, or set it to null for no band. The band's title,
 * dates, image, and Register link come from that event's frontmatter
 * (`title`, `dateDisplay`/`date`, `image` at 1200×675, `registration_url`);
 * `facts` are a few short lines beside the dates, chosen from the event page.
 * The Location fact takes the event's `location` when it has one.
 *
 * It also caps the homepage Events list: nothing dated after the featured
 * event shows there, so the band is the next thing a visitor sees coming up.
 *
 * Once the event's last day (`end_date`, else `date`) has passed, the build
 * warns, hides the band, and lifts the cap, so a stale "Register" never ships.
 */
export const FEATURED_EVENT: {
  section: string;
  slug: string;
  facts: { label: string; value: string }[];
} | null = {
  section: 'events/workshops-and-seminars',
  slug: 'qiskit-fall-fest-2026',
  facts: [
    { label: 'Location', value: 'Clemson University' },
    { label: 'Sessions', value: 'Mondays, Wednesdays, and Fridays, 5:00–6:00 PM' },
    { label: 'Prizes', value: 'Qiskit merch' },
  ],
};

export interface FeaturedEvent {
  href: string;
  title: string;
  date: string;
  dateText: string;
  image: string | null;
  registrationUrl: string | null;
  facts: { label: string; value: string }[];
}

/** The featured event, or null when there is none or it has ended. Reads the
 * event file, so call it once per render and pass the result along. */
export function getFeaturedEvent(): FeaturedEvent | null {
  if (!FEATURED_EVENT) return null;
  const { section, slug, facts } = FEATURED_EVENT;
  const { data } = getPageBySlug(section, slug);
  if (!data) throw new Error(`FEATURED_EVENT ${section}/${slug} has no content file`);
  // A draft or unlisted page has no public page, so the band would link to
  // a 404 on the published site. Fail the build instead.
  if (hiddenAsDraft(data) || isUnlisted(data)) {
    throw new Error(`FEATURED_EVENT ${section}/${slug} is a draft or unlisted page`);
  }
  const date = normalizeDate(data.date);
  if (!date || date === 'TBD') {
    throw new Error(`FEATURED_EVENT ${section}/${slug} needs a YYYY-MM-DD date`);
  }
  const lastDay = normalizeDate(data.end_date) ?? date;
  if (lastDay < todayInClemson()) {
    console.warn(
      `[warn] FEATURED_EVENT ${slug} ended ${lastDay}: the homepage band is hidden. ` +
        'Point FEATURED_EVENT in lib/featured.ts at the next event, or set it to null.',
    );
    return null;
  }
  const location = typeof data.location === 'string' && data.location.trim() ? data.location : null;
  return {
    href: `/${section}/${slug}/`,
    title: String(data.title ?? slug),
    date,
    dateText: typeof data.dateDisplay === 'string' ? data.dateDisplay : formatDate(date),
    image: typeof data.image === 'string' ? data.image : null,
    registrationUrl: typeof data.registration_url === 'string' ? data.registration_url : null,
    facts: facts.map((fact) =>
      fact.label === 'Location' && location ? { ...fact, value: location } : fact,
    ),
  };
}

/** Dated after the featured event ("TBD" counts as later). */
export function isAfterFeatured(page: PageMeta, featured: FeaturedEvent | null): boolean {
  if (!featured || !page.date) return false;
  return page.date === 'TBD' || page.date > featured.date;
}
