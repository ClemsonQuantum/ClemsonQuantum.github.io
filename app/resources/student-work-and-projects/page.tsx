import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import StudentWorkList from '@/components/StudentWorkList';

export const metadata: Metadata = { title: 'Student Work & Projects' };

export default function StudentWorkPage() {
  const works = sortPages(getAllPages('resources/student-work-and-projects'));

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">Student Work &amp; Projects</h1>
      </header>
      <p className="lr-intro">
        Posters and papers from Clemson Quantum members. Click a title for the
        full project page, or open the poster or paper directly.
      </p>
      <StudentWorkList works={works} />
    </div>
  );
}
