import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Resources' };

export default function ResourcesPage() {
  return (
    <>
      <h1>Resources</h1>
      <section>
        <p>
          Clemson University is home to a growing quantum computing community
          spanning multiple departments. Below you will find links to learning
          materials, student work, and information about quantum faculty and
          programs at Clemson.
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

      <section>
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

      <section>
        <h2>Quantum Faculty at Clemson</h2>
        <p>
          Several Clemson professors conduct research and teach courses in
          quantum computing, quantum information, and quantum physics.
        </p>
        <ul className="faculty-list">
          <li>
            <strong>Dr. Rong Ge</strong> — Professor, School of Computing.
            Faculty advisor for the Clemson Quantum Club and instructor of the
            Hands-on Quantum Computing Creative Inquiry and the graduate-level
            Quantum Computing course (CPSC 8230). Research interests include
            high-performance computing, quantum computing education, and quantum
            workforce development.
          </li>
          <li>
            <strong>Dr. Sumanta Tewari</strong> — Professor, Department of
            Physics and Astronomy. An American Physical Society Fellow whose
            research focuses on topological quantum computation, Majorana
            fermions, superconductivity, and condensed matter theory. His work on
            semiconductor-superconductor heterostructures is one of the most
            widely studied platforms for fault-tolerant quantum computing.
          </li>
          <li>
            <strong>Dr. Emily Tucker</strong> — Assistant Professor, Department
            of Industrial Engineering. Research focuses on quantum optimization
            for resilient systems, with applications in disaster relief,
            logistics, and supply chain resilience using stochastic, discrete,
            and quantum optimization methods.
          </li>
        </ul>
      </section>
    </>
  );
}
