import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

export const metadata: Metadata = { title: 'Workshops & Seminars' };

export default function WorkshopsPage() {
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <p className="archive-hero__eyebrow">Learning archive</p>
        <h1 className="archive-hero__title">Workshops &amp; Seminars</h1>
        <p className="archive-hero__lead">
          Learning-focused events hosted by Clemson Quantum and partner
          organizations.
        </p>
      </header>
      <div className="preview-grid">
        {workshops.map((item) => (
          <PreviewCard
            key={item.slug}
            item={item}
            kind="event"
            metaLabel="Workshop"
          />
        ))}
      </div>
    </div>
  );
}
