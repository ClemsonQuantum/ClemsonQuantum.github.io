import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, makeExcerpt } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef } from 'react';
import ModalFormButton, {
  type ModalFormField,
} from '@/components/ModalFormButton';

const PARTICIPANT_FIELDS: ModalFormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
];

const SPONSOR_FIELDS: ModalFormField[] = [
  { name: 'name', label: 'Your name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'organization',
    label: 'Organization / company',
    type: 'text',
    required: true,
  },
  {
    name: 'message',
    label: 'How you’d like to support (optional)',
    multiline: true,
  },
];

// Render marker links (#participant-updates, #sponsor) as in-page modal forms
// instead of mailto: links. Every other link renders as a normal anchor,
// preserving its class/target/rel (e.g. the "Apply Now" link).
function MarkdownLink({
  href,
  children,
  className,
  target,
  rel,
  title,
}: ComponentPropsWithoutRef<'a'>) {
  if (href === '#participant-updates') {
    return (
      <ModalFormButton
        label={children}
        title="Get SC Quantathon v3 updates"
        subtitle="Drop your name and email and we’ll keep you posted on the event."
        subject="SC Quantathon v3 — Participant updates sign-up"
        successMessage="You’re on the list! We’ll email SC Quantathon v3 updates to you."
        submitLabel="Notify me"
        fields={PARTICIPANT_FIELDS}
      />
    );
  }
  if (href === '#sponsor') {
    return (
      <ModalFormButton
        label={children}
        title="Sponsor SC Quantathon v3"
        subtitle="Tell us a bit about you and we’ll follow up with sponsorship details."
        subject="SC Quantathon v3 — Sponsorship inquiry"
        successMessage="Thanks for your interest in sponsoring SC Quantathon v3! We’ll be in touch soon."
        submitLabel="Get in touch"
        fields={SPONSOR_FIELDS}
      />
    );
  }
  return (
    <a href={href} className={className} target={target} rel={rel} title={title}>
      {children}
    </a>
  );
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('events/hackathons').map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('events/hackathons', slug);
  if (!page || !page.data) {
    return { title: String(slug) };
  }
  const title = String(page.data.title ?? slug);
  const description =
    (typeof page.data.summary === 'string' && page.data.summary) ||
    makeExcerpt(page.content ?? '');
  return {
    title,
    description,
    openGraph: { title, description, url: `/events/hackathons/${slug}/` },
  };
}

export default async function HackathonPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug('events/hackathons', slug);
  if (!page || !page.data) {
    return (
      <div className="page-content">
        <h1>Not Found</h1>
        <p>This page could not be found.</p>
      </div>
    );
  }
  const { content } = page;

  return (
    <div className="page-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{ a: MarkdownLink }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
