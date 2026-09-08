# Qiskit Fall Fest 2026 curriculum (Clemson)

Week of November 16–20, 2026. A seminar (guest speaker Monday, Wednesday, Friday; organizers Tuesday, Thursday) plus a notebook lab every day; every lab runs at least one job on real IBM hardware. Progression: foundations and experiments → hardware craft → variational algorithms → HPC and QML → current research. This is a week of learning and coding only: no competition, no judging, no presentations; the only "talk back" is an informal closing discussion on Friday.

This folder holds the **sources** for each day (notebook, Marp slide deck, LaTeX lecture notes). Built artifacts that the website serves go to `public/files/qff-2026/day-N/` and are linked from the day rows on `/events/workshops-and-seminars/qiskit-fall-fest-2026/` (the dashed "coming soon" chips become links once a file exists).

Status: **scaffold only.** Nothing in `day-*/` is written yet; each day's `README.md` is the build sheet for that day. The full options analysis lives outside the repo in `~/Desktop/In Progress/QFF26/Curriculum options.md`.

## Selected week

| Day | Session | Lab | Base material |
|---|---|---|---|
| Mon Nov 16 | Guest seminar + Lab 1 | Quantum and Qiskit 101 | QGSS 2025 Lab 0 + IBM Hello World / Your First Quantum Experiment + QGSS 2025 Lab 1 Ch. 1 and CHSH (double slit, cat, which-path, CHSH) |
| Tue Nov 17 | Seminar + Lab 2 | Real hardware and error correction | Teleportation (QGSS Lab 1 Ch. 2.2), long-range-entanglement opener, QDC Samplomatic §1–3, QDC error detection Part 1, QGSS Lab 4 bit-flip code on hardware |
| Wed Nov 18 | Guest seminar + Lab 3 | QAOA and VQE | QDC 2025 QMOO 12-qubit instances + hand-built H2 VQE with EstimatorV2 |
| Thu Nov 19 | Seminar + Lab 4 | HPC and quantum machine learning | New day: Aer MPS / GPU simulation at scale (Palmetto), quantum-centric supercomputing framing, quantum kernel classifier with a hardware kernel evaluation. Sources TBD (see day-4/README.md) |
| Fri Nov 20 | Guest seminar + Lab 5 | Frontier research on today’s hardware | QDC Z2 lattice gauge theory one plaquette (arXiv:2507.08088) + QDC SKQD Part 1 or IBM’s SQD notebook (arXiv:2501.09702) |

## Layout

```
curriculum/qff-2026/
  README.md            this file
  requirements.txt     pinned Python environment for building and running the notebooks
  day-1/ … day-5/      README.md (build sheet) + notebook.ipynb, slides.md, notes.tex  [TODO]
public/files/qff-2026/day-N/
  qff-dayN-<slug>.ipynb, qff-dayN-slides.pdf, qff-dayN-notes.pdf      [TODO, served by the site]
```

## Conventions for every notebook

- Pin `qiskit==2.5.*`; print `qiskit.__version__` in a `[setup]` cell. Floors: qiskit ≥ 2.1, qiskit-ibm-runtime ≥ 0.40.1, qiskit-aer ≥ 0.17.
- Structure as a Qiskit Pattern: **Map → Optimize (ISA transpile with `generate_preset_pass_manager`) → Execute (`SamplerV2` / `EstimatorV2`) → Post-process**.
- One saved account for the week: `QiskitRuntimeService(name="clemson-qff-2026")`, created in Lab 1 with `getpass`, never a token literal in a cell.
- Backends via `service.least_busy(operational=True, simulator=False, min_num_qubits=…)`; no hard-coded device names.
- Remove every `qc_grader` import and `grade_*` call from the source labs; replace with local `assert` self-checks (`np.allclose`, exact expectations).
- Keep IBM's pedagogy: stated duration and prerequisites at the top, "Checkpoint" predict-then-reveal `<details>` blocks, "Your turn" stubs with hidden solutions.
- Every hardware cell has a cached fallback result (`.npy` / `.json`) so a queue backup never stalls the room.
- Seeds: `np.random.default_rng(seed)`, `AerSimulator(seed_simulator=seed)`; log versions.
- Copy rules: typographic quotes, no em dashes, en dashes in ranges, "Clemson Quantum Club" in full.

## QPU budget (Open Plan: 10 min per user per 28-day window)

| Day | Hardware cells | Estimate per student |
|---|---|---|
| Mon | GHZ, Bell, two-spin energy, phase sweep | ~1–1.5 min |
| Tue | long-range CNOT opener + three small bookends | 2–3 min |
| Wed | 12-qubit QAOA samples + one 4-qubit VQE evaluation | < 1 min |
| Thu | one small kernel-matrix job | < 1 min |
| Fri | one-plaquette Z2 dynamics + 12-qubit Krylov sampling | 1–2 min |

Total roughly 4–7 minutes. Turn off zero-noise extrapolation and twirling multipliers by default; they multiply executions 3–500×.

## Licenses and attribution

- QDC 2025 challenge repo: Apache 2.0 (keep the notice).
- QGSS 2025 labs: author credits in each notebook, no license cell; keep the credits.
- BasQ tutorials (if linked as "go further"): CC BY 4.0 text / Apache 2.0 code, cite as the notebooks request.
- IBM tutorials: public documentation at quantum.cloud.ibm.com.
- Never copy the QDC `save_account.ipynb`, `test.ipynb`, or the Z2-LGT credential cells: they contain a plaintext API token.

## Building (to be written)

A `build.py` that executes each notebook with nbclient, writes an output-stripped copy back to `day-N/`, renders `slides.md` with `npx -y @marp-team/marp-cli --pdf` and `notes.tex` with `latexmk -pdf`, and copies the artifacts to `public/files/qff-2026/day-N/`. Tooling verified on this machine: Python 3.14 venv with Qiskit 2.5.2, TeX Live (plex-sans, physics, braket, tcolorbox), Marp CLI 4.5.1.

```bash
python3 -m venv curriculum/.venv
curriculum/.venv/bin/pip install -r curriculum/qff-2026/requirements.txt
```
