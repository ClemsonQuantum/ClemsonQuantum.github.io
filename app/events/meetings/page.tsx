import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

export const metadata: Metadata = { title: 'Meetings' };

export default function MeetingsPage() {
  const meetings = sortPages(getAllPages('events/meetings'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Meetings</h1>
      </header>
      <div className="preview-grid">
        {meetings.map((item) => (
          <PreviewCard
            key={item.slug}
            item={item}
            kind="event"
            metaLabel="Meeting"
          />
        ))}
      </div>
    </div>
  );
}
