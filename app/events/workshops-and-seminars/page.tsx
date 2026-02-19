import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import NewsCard from '@/components/NewsCard';

export const metadata: Metadata = { title: 'Workshops & Seminars' };

export default function WorkshopsPage() {
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));

  return (
    <>
      <h1>Workshops &amp; Seminars</h1>
      <section>
        <p>Workshops, seminars, and learning events hosted by Clemson Quantum.</p>
      </section>
      <div className="news-cards">
        {workshops.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>
    </>
  );
}
