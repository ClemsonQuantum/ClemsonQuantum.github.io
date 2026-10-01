# Qiskit Fall Fest 2026 curriculum (Clemson)

Two weeks, Monday, November 9 to Friday, November 20, 2026: six sessions on Mondays, Wednesdays, and Fridays, matching the event page (`content/events/workshops-and-seminars/qiskit-fall-fest-2026.md`). Each session is a seminar (a guest speaker or the organizers) followed by a guided Qiskit notebook lab, and each releases an individual challenge built on that day's lab. Labs and challenges run on qBraid, with jobs on IBM Quantum processors. Progression: foundations → hardware and noise → algorithms → cryptography → HPC and QML → error correction.

This folder holds the **sources** for each session (notebook, Marp slide deck, challenge notebook). There are no separate lecture notes: the notes are the markdown cells of each notebook. Built artifacts that the website serves go to `public/files/qff-2026/day-N/` and are linked from the session and challenge rows on `/events/workshops-and-seminars/qiskit-fall-fest-2026/`: each plain-text chip becomes a link once its file exists (see "Sky, cryostat, and hummingbirds" in `content/README.md`).

Status: **scaffold only.** Nothing in `day-*/` is written yet; each day's `README.md` is the build sheet for that session. The options analysis is kept outside the repo.

## Sessions

| Day | Date | Seminar | Lab | Challenge | Base material |
|---|---|---|---|---|---|
| 1 | Mon Nov 9 | Guest (speaker TBD) | Quantum and Qiskit 101 | Biggest GHZ state | QGSS 2025 Lab 0 + IBM Hello World / Your First Quantum Experiment + QGSS 2025 Lab 1 Ch. 1 and CHSH (double slit, cat, which-path, CHSH) |
| 2 | Wed Nov 11 | Organizers | Hardware, noise, and error mitigation | Transpile golf | Transpilation against a real coupling map, readout mitigation, QDC 2025 Samplomatic §1–3 (twirling) |
| 3 | Fri Nov 13 | Guest (speaker TBD) | Algorithms: Grover, QFT, QAOA, VQE | Max-Cut with QAOA | QDC 2025 QMOO 12-qubit instances + hand-built H2 VQE with EstimatorV2; Grover and QFT sources TBD (see day-3/README.md) |
| 4 | Mon Nov 16 | Speaker TBD | Quantum cryptography: no-cloning, BB84, an eavesdropper | Catch the eavesdropper | New session; sources TBD (see day-4/README.md) |
| 5 | Wed Nov 18 | Organizers | HPC and quantum machine learning | Quantum kernel classifier | Aer MPS / GPU simulation at scale (Palmetto 2), quantum-centric supercomputing framing, quantum kernel classifier with a hardware kernel evaluation |
| 6 | Fri Nov 20 | Speaker TBD | Quantum error correction | Repetition code | Teleportation (QGSS 2025 Lab 1 Ch. 2.2), long-range-entanglement opener, QDC 2025 error detection Part 1, QGSS 2025 Lab 4 bit-flip code on hardware |

The September draft's frontier-research day (QDC 2025 Z2 lattice gauge theory and SKQD) was dropped when the event moved to six sessions. It can come back as "go further" material.

## Challenges and leaderboard

Each session releases one individual challenge built on that day's lab. The rule, as the event page states it:

- Each challenge is scored out of 100.
- The first ten people to reach a full 100 on a challenge get a bonus: 10 points for the first, down to 1 point for the tenth.
- The overall standings add both across all six challenges.
- The leaderboard closes Sunday, November 22 at 11:59 PM. The top 5 local participants get Qiskit merch, handed out at Clemson Quantum Club's meeting on Tuesday, November 24.

Each day's `challenge/` needs a challenge notebook (starter code, the task, and how the raw result maps to a score out of 100), any data files it reads, and an organizer-side scoring script. Scores go into the Google Sheet behind the page's leaderboards: one tab per challenge (score plus bonus) and an Overall tab (the totals). See "Leaderboards" in `content/README.md`. Submission details are announced with the first challenge on Monday, November 9.

| Challenge | Raw result behind the score |
|---|---|
| Biggest GHZ state | qubits entangled in a verified GHZ state on hardware |
| Transpile golf | two-qubit gates after fitting a given circuit to an IBM processor's layout; the mitigated result breaks ties |
| Max-Cut with QAOA | best cut of a 12-node graph from hardware samples |
| Catch the eavesdropper | intercepted BB84 exchanges correctly identified |
| Quantum kernel classifier | accuracy on a held-out test set |
| Repetition code | logical error rate on hardware (lower scores higher) |

TODO: the submission route, and the 0–100 mapping for each challenge.

## Layout

```
curriculum/qff-2026/
  README.md            this file
  requirements.txt     pinned Python environment for building and running the notebooks
  day-1/ … day-6/      README.md (build sheet) + notebook.ipynb, slides.md, challenge/  [TODO]
public/files/qff-2026/day-N/
  qff-dayN-<slug>.ipynb, qff-dayN-slides.pdf, qff-dayN-challenge.ipynb  [TODO, served by the site]
```

## Conventions for every notebook

- Pin `qiskit==2.5.*`; print `qiskit.__version__` in a `[setup]` cell. Floors: qiskit ≥ 2.1, qiskit-ibm-runtime ≥ 0.40.1, qiskit-aer ≥ 0.17.
- Structure as a Qiskit Pattern: **Map → Optimize (ISA transpile with `generate_preset_pass_manager`) → Execute (`SamplerV2` / `EstimatorV2`) → Post-process**.
- One saved account for the two weeks: `QiskitRuntimeService(name="clemson-qff-2026")`, created in Lab 1 with `getpass`, never a token literal in a cell.
- Backends via `service.least_busy(operational=True, simulator=False, min_num_qubits=…)`; no hard-coded device names.
- Remove every `qc_grader` import and `grade_*` call from the source labs; replace with local `assert` self-checks (`np.allclose`, exact expectations).
- The notebook is also the session's notes: explanations live in its markdown cells, so there is no separate notes file.
- Keep IBM's pedagogy: stated duration and prerequisites at the top, "Checkpoint" predict-then-reveal `<details>` blocks, "Your turn" stubs with hidden solutions.
- Every hardware cell has a cached fallback result (`.npy` / `.json`) so a queue backup never stalls the room.
- Seeds: `np.random.default_rng(seed)`, `AerSimulator(seed_simulator=seed)`; log versions.
- Copy rules: typographic quotes, no em dashes, en dashes in ranges, "Clemson Quantum Club" in full.

## QPU budget

Labs and challenges run on qBraid, which gives more time on IBM Quantum processors than the free Open Plan. Still plan each lab as if a student had only the Open Plan (10 min per user per 28-day window), so no lab depends on the extra time, and count challenge runs against the same budget.

| Day | Hardware cells | Estimate per student |
|---|---|---|
| 1 | GHZ, Bell, two-spin energy, phase sweep | ~1–1.5 min |
| 2 | transpiled circuit on a real layout, twirled vs untwirled GHZ, readout-mitigation bookends | TBD |
| 3 | 12-qubit QAOA samples + one 4-qubit VQE evaluation | < 1 min |
| 4 | BB84 rounds, if run on hardware at all | TBD |
| 5 | one small kernel-matrix job | < 1 min |
| 6 | long-range CNOT opener (~30 s) + bit-flip code with an injected error | TBD |

Re-estimate the total once Days 2, 4, and 6 and the challenges are planned. Outside the Day 2 cells that demonstrate them, turn off zero-noise extrapolation and twirling multipliers; they multiply executions 3–500×.

## Licenses and attribution

- QDC 2025 challenge repo: Apache 2.0 (keep the notice).
- QGSS 2025 labs: author credits in each notebook, no license cell; keep the credits.
- BasQ tutorials (if linked as "go further"): CC BY 4.0 text / Apache 2.0 code, cite as the notebooks request.
- IBM tutorials: public documentation at quantum.cloud.ibm.com.
- Never copy the QDC `save_account.ipynb`, `test.ipynb`, or the Z2-LGT credential cells: they contain a plaintext API token.

## Building (to be written)

A `build.py` that executes each notebook with nbclient, writes an output-stripped copy back to `day-N/`, renders `slides.md` with `npx -y @marp-team/marp-cli --pdf`, and copies the artifacts to `public/files/qff-2026/day-N/`. Tooling verified on this machine: Python 3.14 venv with Qiskit 2.5.2, Marp CLI 4.5.1.

```bash
python3 -m venv curriculum/.venv
curriculum/.venv/bin/pip install -r curriculum/qff-2026/requirements.txt
```
