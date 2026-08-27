import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import EmailIcon from '@/components/icons/EmailIcon';
import WebsiteIcon from '@/components/icons/WebsiteIcon';
import { LinkedInIcon } from '@/components/icons/ChannelIcons';
import ConstellationDivider from '@/components/ConstellationDivider';
import facultyData from '@/data/faculty.json';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Quantum computing learning materials, student work, and information about quantum faculty and programs at Clemson University.',
  openGraph: pageOpenGraph({
    title: 'Resources | Clemson Quantum Club',
    description:
      'Quantum computing learning materials, student work, and information about quantum faculty and programs at Clemson University.',
    url: '/resources/',
  }),
};

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
      <header className="archive-hero">
        <h1 className="archive-hero__title">Resources</h1>
        <ConstellationDivider />
      </header>

      <section className="archive-section">
        <h2>Start here</h2>
        <div className="resource-cards">
          <Link
            href="/resources/learning-resources/"
            className="hackathon-resource-card hackathon-resource-card--orange"
          >
            <div className="hackathon-resource-title">Learning Resources</div>
            <div className="hackathon-resource-desc">
              Curated bootcamps, lecture series, textbooks, and problem sets to
              learn quantum computing at every level, from hackathon prep to
              going deeper.
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
              Posters and papers from our students and collaborators, each with
              authors, a short summary, and links to artifacts.
            </div>
          </Link>
        </div>
      </section>

      <section className="archive-section">
        <h2>Quantum Courses at Clemson</h2>
        <div className="course-groups">
          <div className="course-group">
            <h3>CPSC</h3>
            <ul>
              <li>Creative Inquiry: Hands-on Quantum Computing (CPSC 3990)</li>
              <li>Introduction to Quantum Computing (CPSC 4750; 6750)</li>
              <li>Quantum Algorithms and Applications (CPSC 4760; 6760)</li>
            </ul>
          </div>
          <div className="course-group">
            <h3>PHYS</h3>
            <ul>
              <li>
                Quantum Mechanics I/II (PHYS 4550/4560, 6550/6560; PHYS
                9510/9520)
              </li>
              <li>Quantum Field Theory (PHYS 9530)</li>
            </ul>
          </div>
          <div className="course-group">
            <h3>IE</h3>
            <ul>
              <li>
                Creative Inquiry: Quantum Optimization for Resilient Systems (IE
                4040)
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="faculty" className="archive-section">
        <h2>Quantum Faculty at Clemson</h2>
        <p>
          Several Clemson professors conduct research and teach courses in
          quantum computing, quantum information, and quantum physics.
        </p>
        <div className="faculty-grid">
          {faculty.map((person) => (
            <article key={person.name} className="faculty-card">
              <div className="faculty-card__top">
                <SiteImage
                  src={person.image}
                  alt={person.name}
                  className="faculty-card__photo"
                />
                <div>
                  <p className="faculty-card__role">{person.role}</p>
                  <h3 className="faculty-card__name">{person.name}</h3>
                  {(person.linkedin || person.website || person.email) && (
                    <div className="faculty-card__links">
                      {person.linkedin && (
                        <a
                          className="faculty-card__link"
                          href={person.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${person.name} on LinkedIn`}
                        >
                          <LinkedInIcon className="faculty-card__link-icon link-icon--brand" />
                        </a>
                      )}
                      {person.email && (
                        <a
                          className="faculty-card__link"
                          href={`mailto:${person.email}`}
                          aria-label={`Email ${person.name}`}
                        >
                          <EmailIcon className="faculty-card__link-icon" />
                        </a>
                      )}
                      {person.website && (
                        <a
                          className="faculty-card__link"
                          href={person.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${person.name} faculty page`}
                        >
                          <WebsiteIcon className="faculty-card__link-icon" />
                        </a>
                      )}
                    </div>
                  )}
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
