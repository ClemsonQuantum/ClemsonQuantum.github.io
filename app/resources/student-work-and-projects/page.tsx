import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import { getAllPages, sortPages } from '@/lib/content';
import StudentWorkList from '@/components/StudentWorkList';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'Student Work & Projects',
  description:
    'Posters, papers, and projects by Clemson Quantum Club members, including research from Creative Inquiry, SRNL, and club hackathons.',
  openGraph: pageOpenGraph({
    title: 'Student Work & Projects | Clemson Quantum Club',
    description:
      'Posters, papers, and projects by Clemson Quantum Club members, including research from Creative Inquiry, SRNL, and club hackathons.',
    url: '/resources/student-work-and-projects/',
  }),
};

export default function StudentWorkPage() {
  const works = sortPages(getAllPages('resources/student-work-and-projects'));

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">Student Work &amp; Projects</h1>
        <ConstellationDivider />
      </header>
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All student work</h2>
      <p className="lr-intro">
        Posters, papers, and conference talks from Clemson Quantum Club members.
        Click a title for the full project page, or open the poster or paper
        directly.
      </p>
      <StudentWorkList works={works} />
    </div>
  );
}
