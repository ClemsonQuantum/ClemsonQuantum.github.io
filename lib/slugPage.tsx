import type { Metadata } from 'next';
import { getPageBySlug, getRoutablePages, makeExcerpt } from '@/lib/content';
import { isUnlisted, normalizeDate } from '@/lib/content-shared.mjs';
import { todayInClemson } from '@/lib/dates.mjs';
import { pageMetadata } from '@/lib/og';
import { SITE_URL } from '@/lib/site';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

// App Router: params arrive as a Promise.
interface Props {
  params: Promise<{ slug: string }>;
}

interface Options {
  // react-markdown renderers (the event routes pass EVENT_COMPONENTS, which
  // turn marker links, divs and spans into modal forms, countdowns and art).
  components?: Components;
  // The size every front-matter `image` on this route has, for og:image
  // width/height (event banners: BANNER_SIZE). Leave it out where sizes vary.
  imageSize?: { width: number; height: number };
}

// Fallback body for a slug with no markdown file, kept only as a type guard:
// generateStaticParams lists exactly the slugs that have files, and with
// output: 'export' even `next dev` throws for any other slug before rendering.
const notFound = (
  <div className="page-content">
    <h1>Not Found</h1>
    <p>This page could not be found.</p>
  </div>
);

// schema.org Event structured data for the hosted event pages (Google's event
// rich results). Emitted only when the frontmatter carries both `end_date` and
// `location`: an Event without a real end date and venue fails the rich-result
// checks, and entries without them (TBD announcements, plain notes) should not
// claim to be a scheduled in-person event at all. Frontmatter contract:
// `date` and `end_date` (YYYY-MM-DD), `location` (venue name), optional
// `street_address` and `registration_url` (absolute URL); everything else is
// fixed (Clemson campus address, free admission, club as organizer). Once the
// event has ended there is nothing left to register for, so the offer goes.
function buildEventJsonLd(
  data: Record<string, unknown>,
  title: string,
  url: string
) {
  const startDate = normalizeDate(data.date);
  const { end_date: endDate, location, street_address: streetAddress } = data;
  const { registration_url: registrationUrl, summary, image } = data;
  if (
    typeof startDate !== 'string' ||
    typeof endDate !== 'string' ||
    typeof location !== 'string'
  ) {
    return null;
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    startDate,
    endDate,
    ...(typeof summary === 'string' ? { description: summary } : {}),
    ...(typeof image === 'string' && image.startsWith('/')
      ? { image: `${SITE_URL}${image}` }
      : {}),
    url,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        ...(typeof streetAddress === 'string' ? { streetAddress } : {}),
        addressLocality: 'Clemson',
        addressRegion: 'SC',
        postalCode: '29634',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Clemson Quantum Club',
      url: SITE_URL,
    },
    ...(typeof registrationUrl === 'string' && endDate >= todayInClemson()
      ? {
          offers: {
            '@type': 'Offer',
            url: registrationUrl,
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

// Shared static-export page factory for the markdown-backed event slug routes.
// `contentSubdir` selects the content directory passed to
// getRoutablePages/getPageBySlug.
export function createSlugPage(contentSubdir: string, options: Options = {}) {
  async function generateStaticParams() {
    // Entries with an external destination link straight there from cards,
    // nav, and search; no internal detail page is generated for them.
    // Unlisted pages ARE generated (reachable by URL), just never listed.
    return getRoutablePages(contentSubdir)
      .filter((p) => !p.isExternal)
      .map((p) => ({ slug: p.slug }));
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page.data) return { title: String(slug) };
    const title = String(page.data.title ?? slug);
    const description =
      (typeof page.data.summary === 'string' && page.data.summary) ||
      makeExcerpt(page.content ?? '');
    const image =
      typeof page.data.image === 'string' ? { url: page.data.image, ...options.imageSize } : undefined;
    return {
      ...pageMetadata({ title, description, path: `/${contentSubdir}/${slug}/`, image }),
      // Unlisted pages are live for review but not announced: keep them out
      // of search engines too, not just out of the site's own listings.
      ...(isUnlisted(page.data) ? { robots: { index: false, follow: false } } : {}),
    };
  }

  async function Page({ params }: Props) {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page.data) return notFound;
    const { content } = page;
    const eventJsonLd = buildEventJsonLd(
      page.data,
      String(page.data.title ?? slug),
      `${SITE_URL}/${contentSubdir}/${slug}/`
    );

    return (
      <>
        <div className="page-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={options.components}
          >
            {content}
          </ReactMarkdown>
        </div>
        {eventJsonLd && (
          <script
            type="application/ld+json"
            // Escape "<" so a summary containing "</script>" can't end the
            // block early; JSON parsers read \u003c back as "<".
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(eventJsonLd).replace(/</g, '\\u003c'),
            }}
          />
        )}
      </>
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}
