import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import NewsCard from '@/components/NewsCard';

export const metadata: Metadata = { title: 'Meetings' };

export default function MeetingsPage() {
  const meetings = sortPages(getAllPages('events/meetings'));

  return (
    <>
      <h1>Meetings</h1>
      <section>
        <p>Club meetings and social events hosted by Clemson Quantum.</p>
      </section>
      <div className="news-cards">
        {meetings.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>
    </>
  );
}
