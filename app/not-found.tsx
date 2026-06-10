import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page Not Found' };

export default function NotFound() {
  return (
    <div className="page-content">
      <h1>Page Not Found</h1>
      <p>The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.</p>
      <p>
        <Link href="/">Back to home</Link> &middot;{' '}
        <Link href="/events/">Events</Link> &middot;{' '}
        <Link href="/news/">News</Link>
      </p>
    </div>
  );
}
