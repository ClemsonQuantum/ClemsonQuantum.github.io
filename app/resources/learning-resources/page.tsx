import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learning Resources',
  description:
    'Curated quantum computing learning path from the Clemson Quantum Club: beginner to advanced courses, tutorials, and practice resources.',
};

interface Resource {
  type: string;
  title: string;
  desc: string;
  href: string;
}

interface Level {
  id: 'beginner' | 'intermediate' | 'advanced';
  num: string;
  label: string;
  title: string;
  blurb: string;
  resources: Resource[];
}

const LEVELS: Level[] = [
  {
    id: 'beginner',
    num: '01',
    label: 'Beginner',
    title: 'Start from zero',
    blurb:
      'No prior quantum experience required. These build your intuition for qubits, gates, and your first circuits — interactive, hands-on, and zero setup.',
    resources: [
      {
        type: 'Course',
        title: 'IBM Quantum Learning',
        desc: 'Interactive lessons that take you from qubits to running real circuits, with code built right in.',
        href: 'https://learning.quantum.ibm.com/',
      },
      {
        type: 'Practice',
        title: 'PennyLane Codebook',
        desc: 'Bite-sized coding exercises that teach quantum concepts as you write them.',
        href: 'https://pennylane.ai/codebook/',
      },
      {
        type: 'Video',
        title: 'Qiskit on YouTube',
        desc: 'Friendly video walkthroughs and coding tutorials from the Qiskit community.',
        href: 'https://www.youtube.com/@qaboratory',
      },
    ],
  },
  {
    id: 'intermediate',
    num: '02',
    label: 'Intermediate',
    title: 'Build & compete',
    blurb:
      'Comfortable with the basics? Put them to work — write real circuits, branch into a second framework, and sharpen up for hackathons.',
    resources: [
      {
        type: 'Course',
        title: 'Cirq Tutorials',
        desc: "Build circuits with Google's Cirq and broaden beyond a single framework.",
        href: 'https://quantumai.google/cirq/start',
      },
      {
        type: 'Practice',
        title: 'IBM Quantum Challenge',
        desc: 'Guided, themed challenges on current quantum topics — excellent hackathon prep.',
        href: 'https://challenges.quantum.ibm.com/',
      },
      {
        type: 'Event',
        title: 'Xanadu QHack',
        desc: 'A global quantum machine-learning hackathon with coding challenges to test your skills.',
        href: 'https://qhack.ai/',
      },
    ],
  },
  {
    id: 'advanced',
    num: '03',
    label: 'Advanced',
    title: 'Go deep',
    blurb:
      'Ready for the theory. Rigorous coursework, the canonical textbooks, and the math behind the algorithms.',
    resources: [
      {
        type: 'Course',
        title: 'MIT OCW 8.370',
        desc: 'A rigorous university course in quantum information — full lecture notes, problem sets, and exams.',
        href: 'https://ocw.mit.edu/courses/8-370x-quantum-information-science-i-spring-2018/',
      },
      {
        type: 'Book',
        title: 'Nielsen & Chuang',
        desc: '“Quantum Computation and Quantum Information” — the field’s standard reference.',
        href: 'https://www.cambridge.org/highereducation/books/quantum-computation-and-quantum-information/01E10196D0A682A6AEFFEA52D53BE9AE',
      },
      {
        type: 'Book',
        title: 'Hidary',
        desc: '“Quantum Computing: An Applied Approach” — theory paired with real, runnable code.',
        href: 'https://link.springer.com/book/10.1007/978-3-030-83274-2',
      },
    ],
  },
];

const ONGOING: { cat: string; title: string; desc: string; href: string }[] = [
  {
    cat: 'Community',
    title: 'QC Stack Exchange',
    desc: 'Ask questions and learn from the quantum computing community.',
    href: 'https://quantumcomputing.stackexchange.com/',
  },
  {
    cat: 'Community',
    title: 'Quantum Open Source Foundation',
    desc: 'Open-source quantum software and a well-known mentorship program.',
    href: 'https://qosf.org/',
  },
  {
    cat: 'News',
    title: 'Quantum Computing Report',
    desc: 'Industry news, analysis, and tracking across the quantum field.',
    href: 'https://quantumcomputingreport.com/',
  },
  {
    cat: 'Reference',
    title: 'Awesome Quantum Computing',
    desc: 'A community-curated list of tools, libraries, and learning materials.',
    href: 'https://github.com/desireevl/awesome-quantum-computing',
  },
];

export default function LearningResourcesPage() {
  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">Learning Resources</h1>
      </header>
      <p className="lr-intro">
        A curated path through quantum computing — from your very first qubit to
        research-level theory. Jump to the stage that fits where you are, and
        work your way down.
      </p>

      {LEVELS.map((level) => (
        <section
          key={level.id}
          id={level.id}
          className={`lr-section lr-section--${level.id}`}
        >
          <span className="lr-section__num" aria-hidden="true">
            {level.num}
          </span>
          <p className="lr-section__eyebrow">
            Level {level.num} · {level.label}
          </p>
          <h2 className="lr-section__title">{level.title}</h2>
          <p className="lr-section__blurb">{level.blurb}</p>

          <ul className="lr-list">
            {level.resources.map((r) => (
              <li key={r.href + r.title} className="lr-item">
                <span className="lr-item__tag">{r.type}</span>
                <span className="lr-item__body">
                  <a
                    className="lr-item__title"
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.title}
                  </a>
                  <span className="lr-item__desc">{r.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="lr-ongoing">
        <h2 className="lr-ongoing__title">Keep going</h2>
        <p className="lr-ongoing__note">
          Community, news, and collections worth bookmarking at any level.
        </p>
        <div className="lr-ongoing__grid">
          {ONGOING.map((o) => (
            <a
              key={o.href}
              className="lr-ongoing__item"
              href={o.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="lr-ongoing__cat">{o.cat}</span>
              <span className="lr-ongoing__name">{o.title}</span>
              <span className="lr-ongoing__desc">{o.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
