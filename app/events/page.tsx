import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import Link from 'next/link';
import { getSortedPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';
import ArchiveHeader from '@/components/ArchiveHeader';

export const metadata: Metadata = pageMetadata({
  title: 'Events',
  description:
    'Quantum computing events at Clemson: hackathons, workshops and seminars, and biweekly club meetings hosted by Clemson Quantum Club.',
  path: '/events/',
});

// Cards each category shows before its "View all" link.
const CARDS_PER_SECTION = 3;

const SECTIONS = [
  { dir: 'events/hackathons', title: 'Hackathons', viewAll: 'View all hackathons' },
  {
    dir: 'events/workshops-and-seminars',
    title: 'Workshops & Seminars',
    viewAll: 'View all workshops & seminars',
  },
  { dir: 'events/meetings', title: 'Meetings', viewAll: 'View all meetings' },
];

export default function EventsPage() {
  return (
    <div className="archive-page">
      <ArchiveHeader title="Events" />

      {SECTIONS.map(({ dir, title, viewAll }) => (
        <section key={dir} className="archive-section">
          <div className="home-section__header">
            <h2 className="home-section__title">{title}</h2>
            <Link href={`/${dir}/`} className="view-all-link">
              {viewAll}
            </Link>
          </div>
          <div className="preview-grid">
            {getSortedPages(dir)
              .slice(0, CARDS_PER_SECTION)
              .map((item) => (
                <PreviewCard key={item.slug} item={item} kind="event" />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
