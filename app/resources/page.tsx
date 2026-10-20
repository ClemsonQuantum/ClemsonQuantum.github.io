import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import ArchiveHeader from '@/components/ArchiveHeader';
import PersonLinks from '@/components/PersonLinks';
import facultyData from '@/data/faculty.json';

export const metadata: Metadata = pageMetadata({
  title: 'Resources',
  description:
    'Quantum computing learning materials, student work, and information about quantum courses and faculty at Clemson University.',
  path: '/resources/',
});

// Card data lives in data/faculty.json — see data/README.md for the fields.
interface Faculty {
  name: string;
  role: string;
  description: string;
  image: string;
  linkedin: string;
  website: string;
  email: string;
}

const faculty = facultyData as Faculty[];

export default function ResourcesPage() {
  return (
    <div className="archive-page">
      <ArchiveHeader title="Resources" />

      <section className="archive-section">
        <h2 className="home-section__title">Start here</h2>
        <div className="resource-cards">
          <Link
            href="/resources/learning-resources/"
            className="hackathon-resource-card hackathon-resource-card--orange"
          >
            <div className="hackathon-resource-title">Learning Resources</div>
            <div className="hackathon-resource-desc">
              Courses, tools, videos, and textbooks, sorted into beginner,
              intermediate, and advanced.
            </div>
          </Link>
          <Link
            href="/resources/student-work-and-projects/"
            className="hackathon-resource-card hackathon-resource-card--violet"
          >
            <div className="hackathon-resource-title">
              Student Work &amp; Projects
            </div>
            <div className="hackathon-resource-desc">
              Posters, papers, and conference talks by Clemson&nbsp;Quantum&nbsp;Club
              members.
            </div>
          </Link>
        </div>
      </section>

      <section className="archive-section">
        <h2 className="home-section__title">Quantum courses at Clemson</h2>
        <div className="course-groups">
          <div className="course-group">
            <h3>Computer Science (CPSC)</h3>
            <ul>
              <li>Creative&nbsp;Inquiry: Hands&#x2011;on&nbsp;Quantum&nbsp;Computing (CPSC&nbsp;3990)</li>
              <li>Introduction to Quantum Computing (CPSC&nbsp;4750/6750)</li>
              <li>Quantum Algorithms and Applications (CPSC&nbsp;4760/6760)</li>
            </ul>
          </div>
          <div className="course-group">
            <h3>Physics and Astronomy (PHYS)</h3>
            <ul>
              <li>
                Quantum Mechanics I/II (PHYS&nbsp;4550/4560, 6550/6560,
                9510/9520)
              </li>
              <li>Quantum Field Theory (PHYS&nbsp;9530)</li>
              <li>Open Quantum Systems (PHYS&nbsp;8750)</li>
            </ul>
          </div>
          <div className="course-group">
            <h3>Industrial Engineering (IE)</h3>
            <ul>
              <li>
                Creative&nbsp;Inquiry: Quantum Optimization for Resilient Systems
                (IE&nbsp;4040)
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="faculty" className="archive-section">
        <h2 className="home-section__title">Quantum faculty at Clemson</h2>
        <p>
          Clemson professors who teach quantum courses or do quantum research,
          and how to reach them.
        </p>
        <div className="faculty-grid">
          {faculty.map((person) => (
            <article key={person.name} className="faculty-card">
              <div className="faculty-card__top">
                {/* Decorative here: the h3 right below already announces the name. */}
                <SiteImage
                  src={person.image}
                  alt=""
                  className="faculty-card__photo"
                />
                <div>
                  <p className="faculty-card__role">{person.role}</p>
                  <h3 className="faculty-card__name">{person.name}</h3>
                  <PersonLinks
                    name={person.name}
                    email={person.email}
                    linkedin={person.linkedin}
                    website={person.website}
                    classPrefix="faculty-card"
                  />
                </div>
              </div>
              <p className="faculty-card__bio">{person.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
