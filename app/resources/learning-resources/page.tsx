import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import ArchiveHeader from '@/components/ArchiveHeader';
import BlochSphere from '@/components/BlochSphere';

export const metadata: Metadata = pageMetadata({
  title: 'Learning Resources',
  description:
    'A quantum computing learning path from Clemson Quantum Club: beginner to advanced courses, tutorials, and practice resources.',
  path: '/resources/learning-resources/',
});

interface Resource {
  type: string;
  title: string;
  desc: string;
  href: string;
  /** Optional companion link rendered after the title (e.g. part II of a
   * two-course sequence). */
  secondary?: { title: string; href: string };
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
      'No prior quantum experience required. These build your intuition for qubits, gates, and your first circuits. Everything runs in the browser.',
    resources: [
      {
        type: 'Course',
        title: 'IBM Quantum Learning',
        desc: 'Interactive lessons for any level, with a detailed four-part fundamentals course.',
        href: 'https://quantum.cloud.ibm.com/learning/en',
      },
      {
        type: 'Tool',
        title: 'IBM Quantum Composer',
        desc: 'Drag-and-drop circuit builder that shows state changes on a live Bloch sphere and histogram as you place each gate.',
        href: 'https://quantum.cloud.ibm.com/composer',
      },
      {
        type: 'Practice',
        title: 'PennyLane Codebook',
        desc: 'Short coding exercises that check your answers as you learn each concept.',
        href: 'https://pennylane.ai/codebook/',
      },
      {
        type: 'Video',
        title: 'Qiskit on YouTube',
        desc: 'Video walkthroughs and coding tutorials from Qiskit.',
        href: 'https://www.youtube.com/@qiskit',
      },
    ],
  },
  {
    id: 'intermediate',
    num: '02',
    label: 'Intermediate',
    title: 'Write your own programs',
    blurb:
      'Tutorials and courses in PennyLane, Q#, and Azure Quantum, plus talks from Google’s quantum team.',
    resources: [
      {
        type: 'Course',
        title: 'PennyLane QML Tutorials',
        desc: 'Runnable quantum machine learning demos covering variational circuits and quantum neural networks.',
        href: 'https://pennylane.ai/learn',
      },
      {
        type: 'Course',
        title: 'Get Started with Azure Quantum',
        desc: 'A Microsoft Learn path through the concepts that ends with running Q# code in Azure Quantum.',
        href: 'https://learn.microsoft.com/en-us/training/paths/quantum-computing-fundamentals/',
      },
      {
        type: 'Practice',
        title: 'Microsoft Quantum Development Kit',
        desc: 'The Q# development kit for VS Code, with the built-in Katas: self-paced exercises with answer checking as you learn.',
        href: 'https://quantum.microsoft.com/en-us/tools/microsoft-quantum-development-kit',
      },
      {
        type: 'Video',
        title: 'Google Quantum AI on YouTube',
        desc: 'Talks and demos from Google’s quantum team, including its error correction results and algorithm walkthroughs.',
        href: 'https://www.youtube.com/@GoogleQuantumAI/videos',
      },
    ],
  },
  {
    id: 'advanced',
    num: '03',
    label: 'Advanced',
    title: 'Go deep',
    blurb:
      'University courses, textbooks, and lecture notes on quantum information and computation.',
    resources: [
      {
        type: 'Course',
        title: 'MIT OCW 8.370',
        desc: 'A two-part MIT sequence in quantum information, with full lecture notes, problem sets, and exams.',
        href: 'https://ocw.mit.edu/courses/8-370x-quantum-information-science-i-spring-2018/',
        secondary: {
          title: '8.371',
          href: 'https://ocw.mit.edu/courses/8-371x-quantum-information-science-ii-spring-2018/',
        },
      },
      {
        type: 'Book',
        title: 'Nielsen & Chuang',
        desc: '“Quantum Computation and Quantum Information,” the field’s standard reference.',
        href: 'https://doi.org/10.1017/CBO9780511976667',
      },
      {
        type: 'Book',
        title: 'Simon',
        desc: '“Topological Quantum: Lecture Notes and Proto-Book,” a modern introduction to anyons, topological phases, and topological quantum computation.',
        href: 'https://www-thphys.physics.ox.ac.uk/people/SteveSimon/topological2021/TopoBook-Sep28-2021.pdf',
      },
      {
        type: 'Video',
        title: 'Preskill’s Ph219 Lectures',
        desc: 'Recorded lectures from Caltech’s Ph/CS 219A Quantum Computation course, taught by John\u00a0Preskill.',
        href: 'https://youtube.com/playlist?list=PL0ojjrEqIyPy-1RRD8cTD_lF1hflo89Iu',
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
    desc: 'Open-source quantum software and a mentorship program.',
    href: 'https://qosf.org/',
  },
  {
    cat: 'News',
    title: 'The Quantum Insider',
    desc: 'Daily news, interviews, and analysis from across the quantum industry.',
    href: 'https://thequantuminsider.com/',
  },
  {
    cat: 'Reference',
    title: 'Awesome Quantum Computing',
    desc: 'A community-maintained list of tools, libraries, and learning materials.',
    href: 'https://github.com/desireevl/awesome-quantum-computing',
  },
];

export default function LearningResourcesPage() {
  return (
    <div className="archive-page">
      <ArchiveHeader title="Learning Resources" />
      <p className="lr-intro">
        Courses, tools, and reading in three levels. Start at whichever level
        fits you.
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
          {level.id === 'beginner' && <BlochSphere />}

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
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {r.secondary && (
                    <>
                      {/* Styled as a title, so the & matches the two titles it joins. */}
                      <span className="lr-item__title">{' & '}</span>
                      <a
                        className="lr-item__title"
                        href={r.secondary.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.secondary.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </>
                  )}
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
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
