'use client';

import { useState, useEffect } from 'react';
import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  SetStateAction,
} from 'react';
import Link from 'next/link';
import type { NavData } from '@/lib/navData';
import type { PageMeta } from '@/lib/content';
import SiteImage from './SiteImage';
import SearchBar from './SearchBar';

interface HeaderProps {
  navData: NavData;
}

const EVENTS_IN_DROPDOWN = 3;

type DropdownId = 'events' | 'resources' | null;
type EventsSubmenuId = 'hackathons' | 'workshops' | 'meetings' | null;

interface EventsSubmenuProps {
  id: Exclude<EventsSubmenuId, null>;
  label: string;
  href: string;
  items: PageMeta[];
  openSubmenu: EventsSubmenuId;
  setOpenSubmenu: Dispatch<SetStateAction<EventsSubmenuId>>;
  closeMenus: () => void;
  viewAllLabel?: string;
}

function EventsSubmenu({
  id,
  label,
  href,
  items,
  openSubmenu,
  setOpenSubmenu,
  closeMenus,
  viewAllLabel,
}: EventsSubmenuProps) {
  const isOpen = openSubmenu === id;

  return (
    <div
      className={`dropdown-submenu${isOpen ? ' dropdown-submenu--open' : ''}`}
      onMouseEnter={() => setOpenSubmenu(id)}
      onFocus={() => setOpenSubmenu(id)}
      onBlur={(e: ReactFocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpenSubmenu((cur) => (cur === id ? null : cur));
        }
      }}
    >
      <Link
        href={href}
        className="nav-dropdown-link nav-dropdown-link--parent"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={closeMenus}
      >
        {label}
      </Link>
      <div className="dropdown-submenu-content" role="menu">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={item.isExternal ? item.href : `${href}${item.slug}/`}
            className="nav-dropdown-link"
            role="menuitem"
            onClick={closeMenus}
            {...(item.isExternal
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {item.title}
          </Link>
        ))}
        {viewAllLabel && (
          <Link
            href={href}
            className="nav-dropdown-link nav-dropdown-link--view-all"
            role="menuitem"
            onClick={closeMenus}
          >
            {viewAllLabel} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Header({ navData }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [openSubmenu, setOpenSubmenu] = useState<EventsSubmenuId>(null);

  function closeMenus() {
    setMenuOpen(false);
    setOpenDropdown(null);
    setOpenSubmenu(null);
  }

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
        closeMenus();
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

  const dropdownHandlers = (id: Exclude<DropdownId, null>) => ({
    onMouseEnter: () => {
      setOpenDropdown(id);
    },
    onMouseLeave: () => {
      setOpenDropdown((cur) => (cur === id ? null : cur));
      if (id === 'events') {
        setOpenSubmenu(null);
      }
    },
    onFocus: () => {
      setOpenDropdown(id);
    },
    onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setOpenDropdown((cur) => (cur === id ? null : cur));
        if (id === 'events') {
          setOpenSubmenu(null);
        }
      }
    },
  });

  const visibleHackathons = navData.hackathons.slice(0, EVENTS_IN_DROPDOWN);
  const hackathonsTruncated = navData.hackathons.length > EVENTS_IN_DROPDOWN;
  const visibleWorkshops = navData.workshops.slice(0, EVENTS_IN_DROPDOWN);
  const workshopsTruncated = navData.workshops.length > EVENTS_IN_DROPDOWN;
  const visibleMeetings = navData.meetings.slice(0, EVENTS_IN_DROPDOWN);
  const meetingsTruncated = navData.meetings.length > EVENTS_IN_DROPDOWN;

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Clemson Quantum Club home">
          <picture>
            {/* Dark-theme logo (white on black) swapped in via prefers-color-scheme;
                light-theme logo (black on white) is the default <img>. */}
            <source
              srcSet="/images/logo-dark.png"
              media="(prefers-color-scheme: dark)"
            />
            <SiteImage
              src="/images/logo-light.png"
              alt="Clemson Quantum"
              className="nav-logo"
            />
          </picture>
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
          <Link href="/about/" className="nav-link" onClick={closeMenus}>About</Link>
          <Link href="/news/" className="nav-link" onClick={closeMenus}>News</Link>

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
              <EventsSubmenu
                id="hackathons"
                label="Hackathons"
                href="/events/hackathons/"
                items={visibleHackathons}
                openSubmenu={openSubmenu}
                setOpenSubmenu={setOpenSubmenu}
                closeMenus={closeMenus}
                viewAllLabel={hackathonsTruncated ? 'View all hackathons' : undefined}
              />
              <EventsSubmenu
                id="workshops"
                label="Workshops & Seminars"
                href="/events/workshops-and-seminars/"
                items={visibleWorkshops}
                openSubmenu={openSubmenu}
                setOpenSubmenu={setOpenSubmenu}
                closeMenus={closeMenus}
                viewAllLabel={workshopsTruncated ? 'View all workshops & seminars' : undefined}
              />
              <EventsSubmenu
                id="meetings"
                label="Meetings"
                href="/events/meetings/"
                items={visibleMeetings}
                openSubmenu={openSubmenu}
                setOpenSubmenu={setOpenSubmenu}
                closeMenus={closeMenus}
                viewAllLabel={meetingsTruncated ? 'View all meetings' : undefined}
              />
              <Link
                href="/events/"
                className="nav-dropdown-link nav-dropdown-link--view-all nav-dropdown-link--all"
                role="menuitem"
                onClick={closeMenus}
              >
                All Events <span aria-hidden="true">&rarr;</span>
              </Link>
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
                <Link href="/resources/learning-resources/" className="nav-dropdown-link" role="menuitem" onClick={closeMenus}>
                  Learning Resources
                </Link>
                <Link href="/resources/student-work-and-projects/" className="nav-dropdown-link" role="menuitem" onClick={closeMenus}>
                  Student Work &amp; Projects
                </Link>
                <Link
                  href="/resources/"
                  className="nav-dropdown-link nav-dropdown-link--view-all nav-dropdown-link--all"
                  role="menuitem"
                  onClick={closeMenus}
                >
                  All Resources <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>

          <Link href="/get-involved/" className="nav-link" onClick={closeMenus}>Get Involved</Link>

          <div className="nav-search-slot">
            <SearchBar />
          </div>
        </div>
      </div>
    </nav>
  );
}
