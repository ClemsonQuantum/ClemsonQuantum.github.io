import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Resources' };

export default function ResourcesPage() {
  return (
    <>
      <h1>Resources</h1>
      <section>
        <p>Text about resources.</p>
        <p>
          Searchable list of all resources. Below are quick links to the two
          main resource hubs on this site.
        </p>
      </section>
      <section>
        <h2>Learning Resources</h2>
        <p>
          Curated learning materials to help students and researchers — from
          bootcamps and lecture series to textbooks and problem sets. Browse:{' '}
          <Link href="/resources/learning-resources/">Learning Resources</Link>.
        </p>
      </section>
      <section>
        <h2>Student Work &amp; Projects</h2>
        <p>
          Browse posters and papers submitted by our students and collaborators.
          Each entry includes authors, a short summary, and links to artifacts
          (PDFs or repositories). Browse:{' '}
          <Link href="/resources/student-work-and-projects/">
            Student Work &amp; Projects
          </Link>
          .
        </p>
      </section>
    </>
  );
}
