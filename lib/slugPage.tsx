import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, makeExcerpt } from '@/lib/content';
import { normalizeDate } from '@/lib/content-shared.mjs';
import { pageOpenGraph } from '@/lib/og';
import { SITE_URL } from '@/lib/site';
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

// react-markdown's default URL filter keeps http(s) and mailto links but
// blanks everything else, including tel:. Content pages list phone numbers
// (event hotel blocks), so pass tel: through and defer to the default for
// the rest.
function urlTransform(url: string): string {
  return /^tel:[+\d()\-. ]+$/i.test(url) ? url : defaultUrlTransform(url);
}

// Next 15 PageProps: params is a Promise.
interface Props {
  params: Promise<{ slug: string }>;
}

interface Options {
  // Per-route react-markdown renderers (e.g. the hackathon pages swap marker
  // links/divs for modal forms and the live countdown).
  components?: Components;
}

// Fallback body for a slug with no markdown file. Only reachable in `next dev`:
// the static export generates exactly the slugs from generateStaticParams.
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
// fixed (Clemson campus address, free admission, club as organizer).
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
    ...(typeof registrationUrl === 'string'
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
// `contentSubdir` selects the content directory passed to getAllPages/getPageBySlug.
export function createSlugPage(contentSubdir: string, options: Options = {}) {
  async function generateStaticParams() {
    // Entries with an external destination link straight there from cards,
    // nav, and search — no internal detail page is generated for them.
    return getAllPages(contentSubdir)
      .filter((p) => !p.isExternal)
      .map((p) => ({ slug: p.slug }));
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page || !page.data) return { title: String(slug) };
    const title = String(page.data.title ?? slug);
    const description =
      (typeof page.data.summary === 'string' && page.data.summary) ||
      makeExcerpt(page.content ?? '');
    const image = typeof page.data.image === 'string' ? page.data.image : undefined;
    return {
      title,
      description,
      openGraph: pageOpenGraph({
        title,
        description,
        url: `/${contentSubdir}/${slug}/`,
        image,
      }),
    };
  }

  async function Page({ params }: Props) {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page || !page.data) return notFound;
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
            urlTransform={urlTransform}
            components={options.components}
          >
            {content}
          </ReactMarkdown>
        </div>
        {eventJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
          />
        )}
      </>
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}
