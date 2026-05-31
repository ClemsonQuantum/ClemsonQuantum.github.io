import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Quantum computing learning materials, student work, and information about quantum faculty and programs at Clemson University.',
};

const faculty = [
  {
    name: 'Dr. Rong Ge',
    role: 'Professor, School of Computing',
    bio:
      'Faculty advisor for the Clemson Quantum Club and instructor of the Hands-on Quantum Computing Creative Inquiry and the graduate Quantum Computing course (CPSC 8230). Research interests include high-performance computing, quantum computing education, and quantum workforce development.',
  },
  {
    name: 'Dr. Sumanta Tewari',
    role: 'Professor, Physics & Astronomy',
    bio:
      'An American Physical Society Fellow whose research focuses on topological quantum computation, Majorana fermions, superconductivity, and condensed matter theory. His work on semiconductor–superconductor heterostructures is one of the most widely studied platforms for fault-tolerant quantum computing.',
  },
  {
    name: 'Dr. Emily Tucker',
    role: 'Assistant Professor, Industrial Engineering',
    bio:
      'Research focuses on quantum optimization for resilient systems, with applications in disaster relief, logistics, and supply chain resilience using stochastic, discrete, and quantum optimization methods.',
  },
];

export default function ResourcesPage() {
  return (
    <div className="archive-page">
      <header className="archive-hero">
        <p className="archive-hero__eyebrow">Clemson Quantum</p>
        <h1 className="archive-hero__title">Resources</h1>
        <p className="archive-hero__lead">
          Clemson University is home to a growing quantum computing community
          spanning multiple departments. Below you&apos;ll find curated learning
          materials, student work, and the faculty and programs driving quantum
          research and education at Clemson.
        </p>
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
        <div className="about-page__focus-grid">
          {faculty.map((person) => (
            <div key={person.name} className="about-page__focus-card">
              <h3>{person.name}</h3>
              <p className="resource-faculty__role">{person.role}</p>
              <p>{person.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
