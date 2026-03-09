import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Learning Resources' };

export default function LearningResourcesPage() {
  return (
    <>
      <h1>Learning Resources</h1>
      <section>
        <p>
          Curated quantum computing learning materials for students and
          researchers at every level. Whether you are preparing for a hackathon,
          studying for a course, or exploring on your own, these resources will
          help you get started and go deeper.
        </p>
      </section>

      <section id="bootcamps">
        <h2>Hackathon Bootcamps</h2>
        <p>
          Short, intensive resources designed to bring participants up to speed
          quickly for quantum hackathons.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://learning.quantum.ibm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">📘</div>
            <div className="hackathon-resource-title">IBM Qiskit Learning</div>
            <div className="hackathon-resource-desc">
              Interactive courses and tutorials covering quantum circuits,
              algorithms, and Qiskit fundamentals
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://pennylane.ai/codebook/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🧠</div>
            <div className="hackathon-resource-title">PennyLane Codebook</div>
            <div className="hackathon-resource-desc">
              Hands-on coding exercises for quantum computing and quantum machine
              learning with PennyLane
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://quantumai.google/cirq/start"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🔬</div>
            <div className="hackathon-resource-title">Cirq Tutorials</div>
            <div className="hackathon-resource-desc">
              Getting started guides and examples for Google&apos;s Cirq quantum
              computing framework
            </div>
          </a>
        </div>
      </section>

      <section id="lectures">
        <h2>Lectures &amp; Courses</h2>
        <p>
          Recorded and live lecture series covering quantum computing
          fundamentals and advanced topics.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://learning.quantum.ibm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🎓</div>
            <div className="hackathon-resource-title">
              IBM Quantum Learning
            </div>
            <div className="hackathon-resource-desc">
              Structured courses from basics to advanced quantum algorithms,
              with integrated coding exercises
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://ocw.mit.edu/courses/8-370x-quantum-information-science-i-spring-2018/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🏛️</div>
            <div className="hackathon-resource-title">
              MIT OCW 8.370
            </div>
            <div className="hackathon-resource-desc">
              MIT OpenCourseWare Quantum Information Science — full lecture
              notes, problem sets, and exams
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://www.youtube.com/@qaboratory"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">▶️</div>
            <div className="hackathon-resource-title">
              Qiskit YouTube
            </div>
            <div className="hackathon-resource-desc">
              Video walkthroughs, coding tutorials, and conference talks from
              the Qiskit community
            </div>
          </a>
        </div>
      </section>

      <section id="online-programs">
        <h2>Online Programs</h2>
        <p>
          Cohort-based events, challenges, and structured online programs for
          quantum learners.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://challenges.quantum.ibm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🏆</div>
            <div className="hackathon-resource-title">
              IBM Quantum Challenge
            </div>
            <div className="hackathon-resource-desc">
              Annual global challenges with guided exercises exploring the
              latest quantum computing topics
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://qhack.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">⚡</div>
            <div className="hackathon-resource-title">Xanadu QHack</div>
            <div className="hackathon-resource-desc">
              Quantum machine learning hackathon and coding challenges hosted by
              Xanadu
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://home.cern/news/announcement/computing/online-introductory-lectures-quantum-computing-cern"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🔭</div>
            <div className="hackathon-resource-title">
              CERN QC Lectures
            </div>
            <div className="hackathon-resource-desc">
              Introductory quantum computing lecture series from CERN, covering
              theory and applications in high-energy physics
            </div>
          </a>
        </div>
      </section>

      <section id="textbooks">
        <h2>Textbooks</h2>
        <p>
          Books and longer-form references to dive deeper into quantum computing
          theory and practice.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://www.cambridge.org/highereducation/books/quantum-computation-and-quantum-information/01E10196D0A682A6AEFFEA52D53BE9AE"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">📖</div>
            <div className="hackathon-resource-title">Nielsen &amp; Chuang</div>
            <div className="hackathon-resource-desc">
              &ldquo;Quantum Computation and Quantum Information&rdquo; — the
              standard reference textbook for the field
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://learning.quantum.ibm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">📗</div>
            <div className="hackathon-resource-title">
              Learn QC with Qiskit
            </div>
            <div className="hackathon-resource-desc">
              Free online textbook from IBM covering quantum computing with
              Python and Qiskit, from basics to applications
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://link.springer.com/book/10.1007/978-3-030-83274-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">📕</div>
            <div className="hackathon-resource-title">Hidary</div>
            <div className="hackathon-resource-desc">
              &ldquo;Quantum Computing: An Applied Approach&rdquo; — practical
              introduction with code examples and real applications
            </div>
          </a>
        </div>
      </section>

      <section id="problems">
        <h2>Problems &amp; Challenges</h2>
        <p>
          Collections of exercises, problem sets, and challenge platforms to
          build and test your quantum computing skills.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://challenges.quantum.ibm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🧩</div>
            <div className="hackathon-resource-title">
              IBM Challenge Archives
            </div>
            <div className="hackathon-resource-desc">
              Past IBM Quantum Challenge problems and solutions — great practice
              for competitive quantum programming
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://pennylane.ai/codebook/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">💡</div>
            <div className="hackathon-resource-title">
              PennyLane Codebook
            </div>
            <div className="hackathon-resource-desc">
              Interactive exercises covering quantum circuits, algorithms, and
              quantum machine learning concepts
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://quantumcomputing.stackexchange.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">💬</div>
            <div className="hackathon-resource-title">
              QC Stack Exchange
            </div>
            <div className="hackathon-resource-desc">
              Community Q&amp;A for quantum computing — ask questions, find
              answers, and learn from experts
            </div>
          </a>
        </div>
      </section>

      <section id="other-resources">
        <h2>Other Resources</h2>
        <p>
          Community organizations, news sources, and curated collections for
          staying up to date with quantum computing.
        </p>
        <div className="hackathon-resources-grid">
          <a
            className="hackathon-resource-card"
            href="https://qosf.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">🌐</div>
            <div className="hackathon-resource-title">QOSF</div>
            <div className="hackathon-resource-desc">
              Quantum Open Source Foundation — promoting open-source quantum
              software and community mentorship programs
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://quantumcomputingreport.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">📰</div>
            <div className="hackathon-resource-title">
              QC Report
            </div>
            <div className="hackathon-resource-desc">
              Quantum Computing Report — news, analysis, and tracking of quantum
              computing industry developments
            </div>
          </a>
          <a
            className="hackathon-resource-card"
            href="https://github.com/desireevl/awesome-quantum-computing"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="hackathon-resource-icon">⭐</div>
            <div className="hackathon-resource-title">
              Awesome QC List
            </div>
            <div className="hackathon-resource-desc">
              Community-curated GitHub list of quantum computing resources,
              libraries, tools, and learning materials
            </div>
          </a>
        </div>
      </section>
    </>
  );
}
