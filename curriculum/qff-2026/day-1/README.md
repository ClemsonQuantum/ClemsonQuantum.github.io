# Day 1: Quantum and Qiskit 101 (foundations + famous experiments)

Status: **placeholder.** Files to produce here: `notebook.ipynb`, `slides.md` (Marp), `notes.tex`.
Served copies go to `public/files/qff-2026/day-1/qff-day1-quantum-qiskit-101.ipynb`, `qff-day1-slides.pdf`, `qff-day1-notes.pdf`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

## Sources
- `~/Desktop/Academia/QC Resources/QGSS 25/lab0.ipynb` (account setup, Bell sanity check, GHZ via Qiskit Patterns, toy coupling map, Sampler + Estimator, hardware bonus). Author credit: Jorge Martínez de Lejarza et al.
- IBM Hello World tutorial: https://quantum.cloud.ibm.com/docs/en/tutorials/hello-world
- IBM Your First Quantum Experiment: https://quantum.cloud.ibm.com/learning/en/courses/use-a-qc-today/your-first-quantum-experiment

## Seminar (guest, 45–60 min): full foundations day
Qubit, superposition, measurement and the Born rule, Bloch sphere, single-qubit gates as rotations, entanglement via the Bell pair (correlations, why it is not classical), the four Qiskit Pattern steps, simulator-first workflow (Aer / StatevectorSampler) before hardware, account and AI-tool norms. Do NOT promise "by the end of the day you will know…" phrasing on the page. Slide sources: Lanes, Foundations of Quantum Mechanics; IBM Qiskit 101 deck (pathways, two-prompt demo).

## Also absorbed from the old Day 2 (QGSS 2025 Lab 1, Chapter 1 + CHSH)
- Double slit as a 1-qubit circuit with a phase sweep (the hardware cell, under 1 min), Schrödinger’s cat widget, which-path measurement, CHSH game beating 75%. Teleportation moved to Day 2.
- Extra dependencies: ipywidgets, Pillow, `happy.png`/`grumpy.png` from `QGSS 25/Lab 1/`.

## Notebook plan
1. Setup: install check, create/save account `clemson-qff-2026` with getpass, verify with `service.backends()`.
2. Bell sanity check (Aer).
3. GHZ: Map → Optimize against a toy coupling map (see the SWAP appear) → Execute (Sampler, Estimator with ZZZ, ZZX, ZII, XXI, ZZI, III) → Post-process (why only ZZI and III are 1).
4. Hardware: GHZ on `least_busy` (formerly Lab 0's bonus).
5. Hello World Bell with EstimatorV2 on hardware.
6. Two-spin Hamiltonian: Sampler histogram, then Estimator energy.
7. Famous experiments: double slit phase sweep (hardware), cat, which-path, CHSH.

## Trims and edits
- Remove `qc_grader` install, `grade_lab0_ex1/ex2`, `check_lab_completion_status`; add asserts on GHZ probabilities and the six expectation values.
- Rename the account; remove the Windows warning about Lab 3.

## Hardware and budget
Three small jobs plus the phase sweep, ~1–1.5 min QPU. Cache fallback results for all.

## Open decisions (TODO)
- Session time and room.
- Whether students create accounts before Monday (recommended) or in the room.
