// @ts-check
// The site's fixed pages (everything not built from content/), in one list
// for app/sitemap.ts and scripts/generate-search-index.mjs. No imports, so
// both the Next build and plain Node can load it. Search shows only the
// title; the excerpt and keywords are matched but never displayed.

/**
 * @typedef {object} StaticPage
 * @property {string} path route with a trailing slash
 * @property {string} title the page's own title
 * @property {string} excerpt one plain sentence about the page
 * @property {string} keywords extra words people search for
 */

/** @type {readonly StaticPage[]} */
export const STATIC_PAGES = Object.freeze([
  {
    path: '/get-involved/',
    title: 'Get Involved',
    excerpt: 'Meeting times, Discord, GroupMe, and the contact form.',
    // generate-search-index.mjs adds the meeting day, time, room and contact
    // email from data/site-config.json.
    keywords: 'join discord groupme tigerquest contact email meeting schedule',
  },
  {
    path: '/about/',
    title: 'About',
    excerpt: 'Who the club is, what it does, and who has led it.',
    keywords: 'mission board officers members',
  },
  {
    path: '/code-of-conduct/',
    title: 'Code of Conduct',
    excerpt: 'How members treat each other, and how to report a problem.',
    keywords: 'report harassment conduct rules',
  },
  {
    path: '/governing-documents/',
    title: 'Governing Documents',
    excerpt: 'The club Constitution, Bylaws, and Code of Conduct.',
    keywords: 'constitution bylaws rules officers elections voting tigerquest dso',
  },
  {
    path: '/resources/',
    title: 'Resources',
    excerpt: 'Learning materials, student work, and quantum faculty at Clemson.',
    keywords: 'faculty professors research programs',
  },
  {
    path: '/resources/learning-resources/',
    title: 'Learning Resources',
    excerpt: 'A learning path from first steps to graduate courses.',
    keywords: 'qiskit pennylane courses textbooks beginner tutorials',
  },
  {
    path: '/resources/student-work-and-projects/',
    title: 'Student Work & Projects',
    excerpt: 'Posters, papers, and talks by club members.',
    keywords: 'posters papers talks research creative inquiry',
  },
  {
    path: '/events/',
    title: 'Events',
    excerpt: 'Hackathons, workshops and seminars, and club events.',
    keywords: 'calendar upcoming past',
  },
  {
    path: '/events/hackathons/',
    title: 'Hackathons',
    excerpt: 'Hackathons the club hosts and competes in.',
    keywords: 'quantathon competition teams',
  },
  {
    path: '/events/workshops-and-seminars/',
    title: 'Workshops & Seminars',
    excerpt: 'Workshops and seminars, including Qiskit Fall Fest.',
    keywords: 'fall fest talks',
  },
  {
    path: '/events/meetings/',
    title: 'Meetings',
    excerpt: 'Club fairs and tabling events.',
    keywords: 'tabling fair',
  },
  {
    path: '/news/',
    title: 'News',
    excerpt: 'News and press coverage of the club.',
    keywords: 'press articles coverage',
  },
]);
