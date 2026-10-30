import siteConfig from '@/data/site-config.json';

// Canonical site origin, no trailing slash. Absolute URLs in the sitemap and
// in structured data are built from it (app/layout.tsx's metadataBase resolves
// relative metadata URLs against the same origin).
export const SITE_URL = 'https://www.clemsonquantum.com';

// The site's meta description, web manifest description and default share
// text. Under ~155 characters so search results show it whole.
export const SITE_DESCRIPTION =
  'A student-led club at Clemson University where students learn quantum computing at any level through meetings, workshops, hackathons, and research.';

export type ChannelId = 'discord' | 'groupme' | 'linkedin' | 'github' | 'tigerquest' | 'instagram';

export interface Channel {
  id: ChannelId;
  label: string;
  href: string;
}

// The club's channels in the order the footer and Get Involved show them. A
// blanked or placeholder URL in data/site-config.json drops that channel
// instead of rendering a dead href="#" link.
export const CHANNELS: Channel[] = (
  [
    { id: 'discord', label: 'Discord', href: siteConfig.discordInvite },
    { id: 'groupme', label: 'GroupMe', href: siteConfig.groupmeUrl },
    { id: 'linkedin', label: 'LinkedIn', href: siteConfig.linkedinUrl },
    { id: 'github', label: 'GitHub', href: siteConfig.githubUrl },
    { id: 'tigerquest', label: 'TigerQuest', href: siteConfig.tigerquestUrl },
    { id: 'instagram', label: 'Instagram', href: siteConfig.instagramUrl },
  ] satisfies Channel[]
).filter(({ href }) => href && href !== '#');
