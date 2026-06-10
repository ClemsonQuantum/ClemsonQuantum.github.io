import type { Metadata } from 'next';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import EmailIcon from '@/components/icons/EmailIcon';
import { LinkedInIcon } from '@/components/icons/ChannelIcons';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Quantum computing learning materials, student work, and information about quantum faculty and programs at Clemson University.',
};

// To finish a card: set `image` to a headshot in /images, and fill any of
// `linkedin` / `website` / `email` to surface those links.
const faculty = [
  {
    name: 'Dr. Rong Ge',
    role: 'Professor, School of Computing',
    description:
      'Faculty advisor for the Clemson Quantum Club and instructor of the Hands-on Quantum Computing Creative Inquiry and the graduate Quantum Computing course (CPSC 8230). Research interests include high-performance computing, quantum computing education, and quantum workforce development.',
    image: '/images/rong-ge.jpg',
    linkedin: 'https://www.linkedin.com/in/rong-ge-64416719/',
    website: 'https://people.computing.clemson.edu/~rge/index.html',
    email: 'rge@clemson.edu',
  },
  {
    name: 'Dr. Emily Tucker',
    role: 'Assistant Professor, Industrial Engineering',
    description:
      'Research focuses on quantum optimization for resilient systems, with applications in disaster relief, logistics, and supply chain resilience using stochastic, discrete, and quantum optimization methods.',
    image: '/images/emily-tucker.jpg',
    linkedin: 'https://www.linkedin.com/in/emilyltucker/',
    website: 'https://sites.google.com/view/EmilyLTucker/',
    email: 'etucke3@clemson.edu',
  },
  {
    name: 'Dr. Ronnie Chowdhury',
    role: 'Professor, Civil Engineering',
    description:
      'Eugene Douglas Mays Chair of Transportation and founding director of the USDOT Center for Connected Multimodal Mobility. His quantum work targets cybersecurity for transportation and smart-city / IoT infrastructure — integrating AI with quantum computing to detect and respond to cyber threats, including the SC Quantum Sentinel initiative. Named a 2024 Clemson University Researcher of the Year.',
    image: '/images/ronnie-chowdhury.jpg',
    linkedin: 'https://www.linkedin.com/in/mashrur-ronnie-chowdhury-ba313260/',
    website: '',
    email: 'mac@clemson.edu',
  },
  {
    name: 'Dr. Sumanta Tewari',
    role: 'Professor, Physics & Astronomy',
    description:
      'An American Physical Society Fellow whose research focuses on topological quantum computation, Majorana fermions, superconductivity, and condensed matter theory. His work on semiconductor–superconductor heterostructures is one of the most widely studied platforms for fault-tolerant quantum computing.',
    image: '/images/sumanta-tewari.jpg',
    linkedin: 'https://www.linkedin.com/in/sumanta-tewari-b2102270/',
    website: '',
    email: 'stewari@clemson.edu',
  },
];

export default function ResourcesPage() {
  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">Resources</h1>
      </header>

      <section className="archive-section">
        <h2>Start here</h2>
        <div className="resource-cards">
          <Link href="/resources/learning-resources/" className="hackathon-resource-card">
            <div className="hackathon-resource-title">Learning Resources</div>
            <div className="hackathon-resource-desc">
              Curated bootcamps, lecture series, textbooks, and problem sets to
              learn quantum computing at every level — from hackathon prep to
              going deeper.
            </div>
          </Link>
          <Link
            href="/resources/student-work-and-projects/"
            className="hackathon-resource-card"
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
        <h2>Quantum Computing Creative Inquiry</h2>
        <p>
          The <strong>Hands-on Quantum Computing</strong> Creative Inquiry is an
          undergraduate research course led by Dr. Rong Ge. Students gain
          practical experience with quantum computing platforms, participate in
          quantum hackathons, and work collaboratively on quantum algorithms and
          computational problem-solving. The program welcomes students from all
          majors and has produced teams that have competed at MIT iQuHACK, the
          NYUAD International Hackathon, and the SC Quantathon series.
        </p>
      </section>

      <section className="archive-section">
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
                          <svg
                            className="faculty-card__link-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M3 12h18" />
                            <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
                          </svg>
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
