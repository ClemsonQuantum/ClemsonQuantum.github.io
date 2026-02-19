import type { Metadata } from 'next';
import { getAllPages, sortPages, formatDate } from '@/lib/content';

export const metadata: Metadata = { title: 'Student Work & Projects' };

export default function StudentWorkPage() {
  const works = sortPages(getAllPages('resources/student-work-and-projects'));

  return (
    <>
      <h1>Student Work &amp; Projects</h1>
      <section id="student-work-listing">
        <h2>All Student Work &amp; Projects</h2>
        <p>
          Below is a list of submitted posters and papers. Click the title to
          view the project page.
        </p>
        {works.map((p) => (
          <section key={p.slug} className="student-work-item">
            <h3>
              <a href={`/resources/student-work-and-projects/${p.slug}/`}>
                {p.title}
              </a>
              {p.type && (
                <small className="type-label">
                  &nbsp;&bull;&nbsp;{p.type.charAt(0).toUpperCase() + p.type.slice(1)}
                </small>
              )}
            </h3>
            <p className="meta">
              {p.date && <span>{formatDate(p.date)}</span>}
              {p.date && p.authors && <span>&nbsp;&bull;&nbsp;</span>}
              {p.authors &&
                p.authors.map((a, i) => (
                  <span key={i}>
                    {a.name}
                    {i < p.authors!.length - 1 ? ', ' : ''}
                  </span>
                ))}
            </p>
            {p.summary && <p className="summary">{p.summary}</p>}
            {!p.summary && p.excerpt && (
              <p className="summary">{p.excerpt}</p>
            )}
            {p.link && (
              <p>
                <a
                  href={p.link}
                  {...(p.link.includes('://') ? { target: '_blank', rel: 'noopener' } : {})}
                >
                  View poster / paper
                </a>
              </p>
            )}
            <hr />
          </section>
        ))}
      </section>
    </>
  );
}
