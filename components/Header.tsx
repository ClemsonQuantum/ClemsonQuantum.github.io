'use client';

import { useState, useEffect } from 'react';
import type { FocusEvent as ReactFocusEvent } from 'react';
import Link from 'next/link';
import type { NavData } from '@/lib/navData';
import SiteImage from './SiteImage';
import SearchBar from './SearchBar';

interface HeaderProps {
  navData: NavData;
}

const HACKATHONS_IN_DROPDOWN = 3;

export default function Header({ navData }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  const dropdownHandlers = (id: string) => ({
    onMouseEnter: () => setOpenDropdown(id),
    onMouseLeave: () => setOpenDropdown((cur) => (cur === id ? null : cur)),
    onFocus: () => setOpenDropdown(id),
    onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setOpenDropdown((cur) => (cur === id ? null : cur));
      }
    },
  });

  const visibleHackathons = navData.hackathons.slice(0, HACKATHONS_IN_DROPDOWN);
  const hackathonsTruncated = navData.hackathons.length > HACKATHONS_IN_DROPDOWN;

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <SiteImage
            src="/images/logo.png"
            alt="Clemson Quantum"
            className="nav-logo"
          />
          <span className="nav-brand-text">Clemson Quantum Club</span>
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
          <Link href="/about/" className="nav-link">About</Link>
          <Link href="/news/" className="nav-link">News</Link>

          <div
            className={`nav-dropdown${openDropdown === 'events' ? ' nav-dropdown--open' : ''}`}
            {...dropdownHandlers('events')}
          >
            <Link
              href="/events/"
              className="nav-link nav-dropdown-trigger"
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'events'}
            >
              Events
              <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="nav-dropdown-panel" role="menu">
              <div className="dropdown-submenu">
                <Link href="/events/hackathons/" className="nav-dropdown-link nav-dropdown-link--parent" role="menuitem">
                  Hackathons
                </Link>
                <div className="dropdown-submenu-content">
                  {visibleHackathons.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.isExternal ? p.href : `/events/hackathons/${p.slug}/`}
                      className="nav-dropdown-link"
                      role="menuitem"
                      {...(p.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {p.title}
                    </Link>
                  ))}
                  {hackathonsTruncated && (
                    <Link
                      href="/events/hackathons/"
                      className="nav-dropdown-link nav-dropdown-link--view-all"
                      role="menuitem"
                    >
                      View all hackathons <span aria-hidden="true">&rarr;</span>
                    </Link>
                  )}
                </div>
              </div>
              <div className="dropdown-submenu">
                <Link href="/events/workshops-and-seminars/" className="nav-dropdown-link nav-dropdown-link--parent" role="menuitem">
                  Workshops &amp; Seminars
                </Link>
                <div className="dropdown-submenu-content">
                  {navData.workshops.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.isExternal ? p.href : `/events/workshops-and-seminars/${p.slug}/`}
                      className="nav-dropdown-link"
                      role="menuitem"
                      {...(p.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="dropdown-submenu">
                <Link href="/events/meetings/" className="nav-dropdown-link nav-dropdown-link--parent" role="menuitem">
                  Meetings
                </Link>
                <div className="dropdown-submenu-content">
                  {navData.meetings.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.isExternal ? p.href : `/events/meetings/${p.slug}/`}
                      className="nav-dropdown-link"
                      role="menuitem"
                      {...(p.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/events/" className="nav-dropdown-link" role="menuitem">All Events</Link>
            </div>
          </div>

          <div
            className={`nav-dropdown${openDropdown === 'resources' ? ' nav-dropdown--open' : ''}`}
            {...dropdownHandlers('resources')}
          >
            <Link
              href="/resources/"
              className="nav-link nav-dropdown-trigger"
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'resources'}
            >
              Resources
              <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="nav-dropdown-panel" role="menu">
              <div className="nav-dropdown-section">
                <Link href="/resources/learning-resources/" className="nav-dropdown-link" role="menuitem">
                  Learning Resources
                </Link>
                <Link href="/resources/student-work-and-projects/" className="nav-dropdown-link" role="menuitem">
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
