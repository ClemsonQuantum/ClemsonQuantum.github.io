import SiteImage from './SiteImage';

export interface EventCardData {
  title: string;
  date?: string;
  location: string;
  backgroundImage: string;
  backLines: string[];
  link?: string;
}

function formatEventDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EventCard({
  title,
  date,
  location,
  backgroundImage,
  link,
}: EventCardData) {
  const formattedDate = formatEventDate(date);
  const href = link || '#';
  const isExternal = link?.startsWith('http');

  return (
    <a
      className="event-item"
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}
    >
      <SiteImage className="event-item__img" src={backgroundImage} alt={title} loading="lazy" />
      <div className="event-item__body">
        {formattedDate && <span className="event-item__date">{formattedDate}</span>}
        <h3 className="event-item__title">{title}</h3>
        {location && <p className="event-item__location">{location}</p>}
      </div>
    </a>
  );
}
