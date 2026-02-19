import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import NewsCard from '@/components/NewsCard';

export const metadata: Metadata = { title: 'Hackathons' };

export default function HackathonsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));

  return (
    <>
      <h1>Hackathons</h1>
      <section>
        <p>Quantum hackathons participated in and hosted by Clemson Quantum.</p>
      </section>
      <div className="news-cards">
        {hackathons.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>
    </>
  );
}
