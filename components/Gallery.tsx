'use client';

import { useRef } from 'react';

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/back.png"
        id="backBtn"
        alt="Previous"
        style={{ cursor: 'pointer' }}
        onClick={() => scroll('left')}
      />
      <div className="gallery" ref={scrollRef} onWheel={handleWheel}>
        {items.map((item, i) => (
          <span
            key={i}
            onClick={() => {
              window.location.href = item.href;
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.caption} />
            <p className="gallery-caption">{item.caption}</p>
          </span>
        ))}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/next.png"
        id="nextBtn"
        alt="Next"
        style={{ cursor: 'pointer' }}
        onClick={() => scroll('right')}
      />
    </div>
  );
}
