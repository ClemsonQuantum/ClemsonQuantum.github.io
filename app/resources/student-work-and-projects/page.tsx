import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import { getSortedPages } from '@/lib/content';
import StudentWorkList from '@/components/StudentWorkList';
import ArchiveHeader from '@/components/ArchiveHeader';

export const metadata: Metadata = pageMetadata({
  title: 'Student Work & Projects',
  description:
    'Posters, papers, and conference talks by Clemson Quantum Club members, including Creative Inquiry research.',
  path: '/resources/student-work-and-projects/',
});

export default function StudentWorkPage() {
  const works = getSortedPages('resources/student-work-and-projects');

  return (
    <div className="archive-page">
      <ArchiveHeader title="Student Work & Projects" />
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All student work</h2>
      <p className="lr-intro">
        Posters, papers, and conference talks from Clemson&nbsp;Quantum&nbsp;Club members.
        Open a title for its abstract, files, and links.
      </p>
      <StudentWorkList works={works} />
    </div>
  );
}
