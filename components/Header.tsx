'use client';

import { useState, useEffect } from 'react';
import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavData, NavItem } from '@/lib/navData';
import ClubLogo from './ClubLogo';
import SearchBar from './SearchBar';

interface HeaderProps {
  navData: NavData;
}

// On the hamburger nav (≤50em), dropdowns/submenus open on tap, not hover.
// The breakpoint must match the drawer media query in assets/css/style.css
// (max-width: 50em, desktop from 50.0625em: 800px and 801px at the default
// text size, wider when the visitor's browser text size is larger).
// The MediaQueryList is created once and reused — handlers call this on every
// hover/focus/click across the nav.
let mobileNavQuery: MediaQueryList | null = null;
const isMobileNav = () => {
  if (typeof window === 'undefined') return false;
  mobileNavQuery ??= window.matchMedia('(max-width: 50em)');
  return mobileNavQuery.matches;
};

type DropdownId = 'events' | 'resources' | null;
type EventsSubmenuId = 'hackathons' | 'workshops' | 'meetings' | null;

// The Events panel's submenus, in order; each lists navData[id].
const SUBMENUS: {
  id: Exclude<EventsSubmenuId, null>;
  label: string;
  href: string;
  viewAllLabel: string;
}[] = [
  { id: 'hackathons', label: 'Hackathons', href: '/events/hackathons/', viewAllLabel: 'View all hackathons' },
  {
    id: 'workshops',
    label: 'Workshops & Seminars',
    href: '/events/workshops-and-seminars/',
    viewAllLabel: 'View all workshops & seminars',
  },
  { id: 'meetings', label: 'Meetings', href: '/events/meetings/', viewAllLabel: 'View all meetings' },
];

// "page" on the link to the page being shown, "true" on the top-level item
// whose section holds it (Events while on a hackathon page). The site uses
// trailing slashes; the pathname may arrive without one.
type NavCurrent = 'page' | 'true' | undefined;
function navCurrent(pathname: string, href: string): NavCurrent {
  const here = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (here === href) return 'page';
  return here.startsWith(href) ? 'true' : undefined;
}

interface EventsSubmenuProps {
  id: Exclude<EventsSubmenuId, null>;
  label: string;
  href: string;
  items: NavItem[];
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
      onMouseEnter={() => { if (!isMobileNav()) setOpenSubmenu(id); }}
      onFocus={() => { if (!isMobileNav()) setOpenSubmenu(id); }}
      onBlur={(e: ReactFocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpenSubmenu((cur) => (cur === id ? null : cur));
        }
      }}
    >
      <Link
        href={href}
        prefetch={false}
        className="nav-dropdown-link nav-dropdown-link--parent"
        aria-expanded={isOpen}
        onClick={(e) => {
          if (isMobileNav()) {
            e.preventDefault();
            setOpenSubmenu((cur) => (cur === id ? null : id));
          } else {
            closeMenus();
          }
        }}
      >
        {label}
      </Link>
      {/* Disclosure-pattern nav (APG): plain links revealed by the parent's
          aria-expanded — no menu roles, which would promise arrow-key
          behavior this nav doesn't implement. */}
      <div className="dropdown-submenu-content">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="nav-dropdown-link"
            onClick={closeMenus}
            {...(item.isExternal
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {item.title}
            {item.isExternal && <span className="sr-only"> (opens in a new tab)</span>}
          </Link>
        ))}
        {viewAllLabel && (
          <Link
            href={href}
            prefetch={false}
            className="nav-dropdown-link nav-dropdown-link--view-all"
            onClick={closeMenus}
          >
            {viewAllLabel} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}

interface DropdownTriggerProps {
  id: Exclude<DropdownId, null>;
  href: string;
  label: string;
  open: boolean;
  current: NavCurrent;
  setOpenDropdown: Dispatch<SetStateAction<DropdownId>>;
  setOpenSubmenu: Dispatch<SetStateAction<EventsSubmenuId>>;
  setDismissed: Dispatch<SetStateAction<DropdownId>>;
}

// A top-level item that is both a link to its section and the disclosure
// button for its dropdown panel (`${id}-panel`).
function DropdownTrigger({
  id,
  href,
  label,
  open,
  current,
  setOpenDropdown,
  setOpenSubmenu,
  setDismissed,
}: DropdownTriggerProps) {
  // Desktop keyboard: focus alone doesn't open the panel, so Tab moves along
  // the bar. Enter or Space opens a closed panel (Enter on an open one
  // follows the link, Space closes it); ArrowDown opens it and moves to its
  // first link. On the drawer, Enter fires the tap toggle in onClick.
  function onKeyDown(e: ReactKeyboardEvent<HTMLAnchorElement>) {
    if (isMobileNav()) return;
    const space = e.key === ' ';
    if (e.key === 'Enter' && open) return;
    if (!space && e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (space && open) {
      // Dismissed, like Escape: the pointer may still be over the panel.
      setDismissed(id);
      setOpenDropdown(null);
      setOpenSubmenu(null);
      return;
    }
    setDismissed(null);
    setOpenDropdown(id);
    if (e.key === 'ArrowDown') {
      // After the re-render shows the panel; hidden links can't take focus.
      setTimeout(() => {
        document.getElementById(`${id}-panel`)?.querySelector<HTMLElement>('a[href]')?.focus();
      }, 0);
    }
  }

  return (
    <Link
      href={href}
      className="nav-link"
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      aria-current={current}
      onClick={(e) => {
        if (isMobileNav()) {
          e.preventDefault();
          setOpenSubmenu(null);
          setOpenDropdown((cur) => (cur === id ? null : id));
        }
      }}
      onKeyDown={onKeyDown}
    >
      {label}
      <svg className="nav-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

export default function Header({ navData }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [openSubmenu, setOpenSubmenu] = useState<EventsSubmenuId>(null);
  // A desktop dropdown closed from the keyboard (Escape, or Space on its
  // trigger) stays closed (its CSS hover reveal is suppressed and its links
  // leave the tab order) until focus leaves it or the pointer re-enters.
  const [dismissed, setDismissed] = useState<DropdownId>(null);

  function closeMenus() {
    setMenuOpen(false);
    setOpenDropdown(null);
    setOpenSubmenu(null);
  }

  // Any navigation closes the menus, including ones the drawer's links don't
  // see: a search result, Enter in the search box, browser back and forward.
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  if (pathname !== path) {
    setPath(pathname);
    closeMenus();
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

  // Escape closes whatever is open. Focus goes back to what opened it: the
  // drawer's toggle, or a desktop dropdown's trigger link (APG disclosure
  // navigation). The listener is re-attached whenever the open state
  // changes, so it never reads stale values.
  useEffect(() => {
    if (!menuOpen && !openDropdown && !openSubmenu) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const dropdown = !isMobileNav() ? openDropdown : null;
      if (dropdown) setDismissed(dropdown);
      closeMenus();
      if (menuOpen) document.getElementById('navToggle')?.focus();
      else if (dropdown) {
        // Only when focus was in that dropdown: a panel opened by hover
        // while the user types elsewhere (the search box) must not steal it.
        const trigger = document.querySelector<HTMLElement>(`[aria-controls="${dropdown}-panel"]`);
        if (!trigger?.closest('.nav-dropdown')?.contains(document.activeElement)) return;
        // Now, before the re-render hides the dismissed panel: focus still
        // on one of its links would otherwise drop to the page body.
        trigger.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, openDropdown, openSubmenu]);

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
      if (isMobileNav()) return;
      setDismissed((cur) => (cur === id ? null : cur));
      setOpenDropdown(id);
    },
    onMouseLeave: () => {
      if (isMobileNav()) return;
      setOpenDropdown((cur) => (cur === id ? null : cur));
      if (id === 'events') {
        setOpenSubmenu(null);
      }
    },
    onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDismissed((cur) => (cur === id ? null : cur));
        setOpenDropdown((cur) => (cur === id ? null : cur));
        if (id === 'events') {
          setOpenSubmenu(null);
        }
      }
    },
  });

  // The bar is the page's banner landmark (<header>) with the labelled <nav>
  // landmark inside it; .nav and .nav-inner are purely class-based styles.
  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <nav className="nav-inner" aria-label="Main">
        <Link href="/" prefetch={false} className="nav-brand" aria-label="Clemson Quantum Club home">
          <ClubLogo className="nav-logo" eager />
        </Link>

        <button
          type="button"
          className={`nav-toggle${menuOpen ? ' nav-toggle--open' : ''}`}
          id="navToggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="navLinks"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>

        <div
          className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}
          id="navLinks"
          // Tabbing out of the open phone sheet closes it, so focus never lands
          // on page content hidden under the sheet. Shift+Tab back to the menu
          // button keeps it open; a click elsewhere is the click listener's job.
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            const toggle = document.getElementById('navToggle');
            if (menuOpen && next && !e.currentTarget.contains(next) && !toggle?.contains(next)) {
              closeMenus();
            }
          }}
        >
          <Link href="/about/" className="nav-link" aria-current={navCurrent(path, '/about/')} onClick={closeMenus}>About</Link>
          <Link href="/news/" className="nav-link" aria-current={navCurrent(path, '/news/')} onClick={closeMenus}>News</Link>

          <div
            className={`nav-dropdown${openDropdown === 'events' ? ' nav-dropdown--open' : ''}${dismissed === 'events' ? ' nav-dropdown--dismissed' : ''}`}
            {...dropdownHandlers('events')}
          >
            <DropdownTrigger
              id="events"
              href="/events/"
              label="Events"
              open={openDropdown === 'events'}
              current={navCurrent(path, '/events/')}
              setOpenDropdown={setOpenDropdown}
              setOpenSubmenu={setOpenSubmenu}
              setDismissed={setDismissed}
            />
            <div className="nav-dropdown-panel" id="events-panel">
              {SUBMENUS.map(({ id, label, href, viewAllLabel }) => (
                <EventsSubmenu
                  key={id}
                  id={id}
                  label={label}
                  href={href}
                  items={navData[id].items}
                  openSubmenu={openSubmenu}
                  setOpenSubmenu={setOpenSubmenu}
                  closeMenus={closeMenus}
                  viewAllLabel={viewAllLabel}
                />
              ))}
              <Link
                href="/events/"
                prefetch={false}
                className="nav-dropdown-link nav-dropdown-link--view-all"
                onClick={closeMenus}
              >
                View all events <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <div
            className={`nav-dropdown${openDropdown === 'resources' ? ' nav-dropdown--open' : ''}${dismissed === 'resources' ? ' nav-dropdown--dismissed' : ''}`}
            {...dropdownHandlers('resources')}
          >
            <DropdownTrigger
              id="resources"
              href="/resources/"
              label="Resources"
              open={openDropdown === 'resources'}
              current={navCurrent(path, '/resources/')}
              setOpenDropdown={setOpenDropdown}
              setOpenSubmenu={setOpenSubmenu}
              setDismissed={setDismissed}
            />
            <div className="nav-dropdown-panel" id="resources-panel">
              <div className="nav-dropdown-section">
                <Link href="/resources/learning-resources/" prefetch={false} className="nav-dropdown-link" onClick={closeMenus}>
                  Learning Resources
                </Link>
                <Link href="/resources/student-work-and-projects/" prefetch={false} className="nav-dropdown-link" onClick={closeMenus}>
                  Student Work &amp; Projects
                </Link>
                <Link
                  href="/resources/"
                  prefetch={false}
                  className="nav-dropdown-link nav-dropdown-link--view-all"
                  onClick={closeMenus}
                >
                  View all resources <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>

          <Link href="/get-involved/" className="nav-link" aria-current={navCurrent(path, '/get-involved/')} onClick={closeMenus}>Get Involved</Link>

          <div className="nav-search-slot">
            <SearchBar />
          </div>
        </div>
      </nav>
    </header>
  );
}
