import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/og';
import { getSortedPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ArchiveHeader from '@/components/ArchiveHeader';
import siteConfig from '@/data/site-config.json';
import meetingSchedule from '@/data/meeting-schedule.json';

export const metadata: Metadata = pageMetadata({
  title: 'Meetings',
  description:
    'Club fairs and tabling events, plus the biweekly meeting schedule.',
  path: '/events/meetings/',
});

export default function MeetingsPage() {
  const meetings = getSortedPages('events/meetings');

  return (
    <div className="archive-page">
      <ArchiveHeader title="Meetings" />
      {/* Built from data/ so the time, room, and semester never drift from
          the Get Involved page. */}
      <p className="lr-intro">
        Any student is welcome at club meetings ({siteConfig.meetingDay.replace(/^Biweekly/, 'biweekly')} at{' '}
        {siteConfig.meetingTime}, {siteConfig.location}). See the{' '}
        <Link href="/get-involved/">{meetingSchedule.semester.replace(/ /g, '\u00a0')} schedule</Link>.
        Fairs and other one&#x2011;off events are below.
      </p>
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All meetings</h2>
      <EventArchive items={meetings} />
    </div>
  );
}
