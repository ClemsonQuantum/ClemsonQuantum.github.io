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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const toggle = document.getElementById('navToggle');
      const links = document.getElementById('navLinks');
      if (
        toggle &&
        links &&
        !toggle.contains(e.target as Node) &&
        !links.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <SiteImage
            src="/images/logo.png"
            alt="Clemson Quantum"
            className="nav-logo"
          />
          <span className="nav-brand-text">Clemson Quantum</span>
        </Link>

        <button
          className={`nav-toggle${menuOpen ? ' nav-toggle--open' : ''}`}
          id="navToggle"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>

        <div
          className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}
          id="navLinks"
        >
          <Link href="/news/" className="nav-link">News</Link>

          <div className="nav-dropdown">
            <Link href="/events/" className="nav-link nav-dropdown-trigger">
              Events
              <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="nav-dropdown-panel">
              <div className="dropdown-submenu">
                <Link href="/events/hackathons/" className="nav-dropdown-link nav-dropdown-link--parent">
                  Hackathons
                </Link>
                <div className="dropdown-submenu-content">
                  {navData.hackathons.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.isExternal ? p.href : `/events/hackathons/${p.slug}/`}
                      className="nav-dropdown-link"
                      {...(p.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="dropdown-submenu">
                <Link href="/events/workshops-and-seminars/" className="nav-dropdown-link nav-dropdown-link--parent">
                  Workshops &amp; Seminars
                </Link>
                <div className="dropdown-submenu-content">
                  {navData.workshops.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.isExternal ? p.href : `/events/workshops-and-seminars/${p.slug}/`}
                      className="nav-dropdown-link"
                      {...(p.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/events/" className="nav-dropdown-link">All Events</Link>
            </div>
          </div>

          <div className="nav-dropdown">
            <Link href="/resources/" className="nav-link nav-dropdown-trigger">
              Resources
              <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="nav-dropdown-panel">
              <div className="nav-dropdown-section">
                <Link href="/resources/learning-resources/" className="nav-dropdown-link">
                  Learning Resources
                </Link>
                <Link href="/resources/student-work-and-projects/" className="nav-dropdown-link">
                  Student Work &amp; Projects
                </Link>
              </div>
            </div>
          </div>

          <Link href="/get-involved/" className="nav-link">Get Involved</Link>

          <div className="nav-search-slot">
            <SearchBar />
          </div>
        </div>
      </div>
    </nav>
  );
}
