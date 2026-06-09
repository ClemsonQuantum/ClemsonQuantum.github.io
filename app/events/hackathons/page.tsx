import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

export const metadata: Metadata = { title: 'Hackathons' };

export default function HackathonsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Hackathons</h1>
      </header>
      <div className="preview-grid">
        {hackathons.map((item) => (
          <PreviewCard key={item.slug} item={item} kind="event" />
        ))}
      </div>
    </div>
  );
}
