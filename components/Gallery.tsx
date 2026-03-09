'use client';

import { useRef } from 'react';
import Link from 'next/link';
import SiteImage from './SiteImage';

export interface GalleryItem {
  href: string;
  src: string;
  caption: string;
}

interface GalleryProps {
  items: GalleryItem[];
}

export default function Gallery({ items }: GalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return;
    scrollRef.current.style.scrollBehavior = 'smooth';
    scrollRef.current.scrollLeft += direction === 'right' ? 320 : -320;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (!scrollRef.current) return;
    scrollRef.current.style.scrollBehavior = 'auto';
    scrollRef.current.scrollLeft += e.deltaY;
  }

  return (
    <div className="gallery-wrap">
      <button
        className="gallery-nav-btn"
        aria-label="Previous"
        onClick={() => scroll('left')}
      >
        <SiteImage src="/images/back.png" alt="" />
      </button>
      <div className="gallery" ref={scrollRef} onWheel={handleWheel}>
        {items.map((item) => (
          <Link
            key={item.src}
            href={item.href}
            className="gallery-item"
          >
            <SiteImage src={item.src} alt={item.caption} />
            <p className="gallery-caption">{item.caption}</p>
          </Link>
        ))}
      </div>
      <button
        className="gallery-nav-btn"
        aria-label="Next"
        onClick={() => scroll('right')}
      >
        <SiteImage src="/images/next.png" alt="" />
      </button>
    </div>
  );
}
