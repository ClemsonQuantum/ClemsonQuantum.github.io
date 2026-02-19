import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import NewsCard from '@/components/NewsCard';

export const metadata: Metadata = { title: 'News' };

export default function NewsPage() {
  const items = sortPages(getAllPages('news'));

  return (
    <>
      <h1>News</h1>
      <section>
        <p>News articles featuring the club and its members.</p>
      </section>
      <div className="news-cards">
        {items.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>
    </>
  );
}
