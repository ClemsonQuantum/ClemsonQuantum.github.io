'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { NavData } from '@/lib/navData';
import SiteImage from './SiteImage';
import SearchBar from './SearchBar';

interface HeaderProps {
  navData: NavData;
}

export default function Header({ navData }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const bubble = document.getElementById('navBubble');
      const links = document.getElementById('navLinks');
      if (
        bubble &&
        links &&
        !bubble.contains(e.target as Node) &&
        !links.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const nav = document.querySelector('.nav') as HTMLElement | null;
    if (!nav) return;
    let lastScrollY = window.scrollY;

    function handleNavVisibility() {
      if (!nav) return;
      if (window.innerWidth > 360) {
        nav.style.top = '';
        return;
      }
      if (window.scrollY <= 0) {
        nav.style.top = '0';
      } else if (window.scrollY > lastScrollY) {
        nav.style.top = '-80px';
      } else {
        nav.style.top = '0';
      }
      lastScrollY = window.scrollY;
    }

    window.addEventListener('scroll', handleNavVisibility);
    window.addEventListener('resize', handleNavVisibility);
    return () => {
      window.removeEventListener('scroll', handleNavVisibility);
      window.removeEventListener('resize', handleNavVisibility);
    };
  }, []);

  return (
    <div className="nav">
      <button
        className="nav-bubble"
        id="navBubble"
        aria-label="Open navigation"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span>&#9776;</span>
      </button>
      <div
        className={`nav-links${menuOpen ? ' show' : ''}`}
        id="navLinks"
      >
        <Link href="/">
          <SiteImage
            src="/images/logo.png"
            alt="Clemson Quantum"
            className="nav-logo"
          />
        </Link>

        <Link href="/news/">News</Link>

        <div className="dropdown">
          <Link href="/events/" className="dropdown-btn">
            Events
          </Link>
          <div className="dropdown-content">
            <div className="dropdown-submenu">
              <Link href="/events/hackathons/" className="dropdown-btn">
                Hackathons
              </Link>
              <div className="dropdown-content">
                {navData.hackathons.map((p) => (
                  <Link
                    key={p.slug}
                    href={
                      p.isExternal ? p.href : `/events/hackathons/${p.slug}/`
                    }
                    {...(p.isExternal
                      ? { target: '_blank', rel: 'noopener' }
                      : {})}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="dropdown-submenu">
              <Link
                href="/events/workshops-and-seminars/"
                className="dropdown-btn"
              >
                Workshops &amp; Seminars
              </Link>
              <div className="dropdown-content">
                {navData.workshops.map((p) => (
                  <Link
                    key={p.slug}
                    href={
                      p.isExternal
                        ? p.href
                        : `/events/workshops-and-seminars/${p.slug}/`
                    }
                    {...(p.isExternal
                      ? { target: '_blank', rel: 'noopener' }
                      : {})}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/events/">All Events</Link>
          </div>
        </div>

        <div className="dropdown">
          <Link href="/resources/" className="dropdown-btn">
            Resources
          </Link>
          <div className="dropdown-content">
            <Link href="/resources/learning-resources/">
              Learning Resources
            </Link>
            <Link href="/resources/student-work-and-projects/">
              Student Work &amp; Projects
            </Link>
            <Link href="/resources/">All Resources</Link>
          </div>
        </div>

        <Link href="/get-involved/">Get Involved</Link>

        <SearchBar />
      </div>
    </div>
  );
}
