# Day 1 (Mon Nov 9): Quantum and Qiskit 101

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-1/qff-day1-quantum-qiskit-101.ipynb`, `qff-day1-slides.pdf`, `qff-day1-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

## Sources
- QGSS 2025 Lab 0, `lab0.ipynb` (account setup, Bell sanity check, GHZ via Qiskit Patterns, toy coupling map, Sampler + Estimator, hardware bonus). Author credit: Jorge Martínez de Lejarza et al.
- IBM Hello World tutorial: https://quantum.cloud.ibm.com/docs/en/tutorials/hello-world
- IBM Your First Quantum Experiment: https://quantum.cloud.ibm.com/learning/en/courses/use-a-qc-today/your-first-quantum-experiment

## Seminar (guest, speaker TBD, 45–60 min): the foundations
Qubit, superposition, measurement and the Born rule, Bloch sphere, single-qubit gates as rotations, entanglement through the Bell pair and GHZ states (correlations, why they are not classical), the four Qiskit Pattern steps, simulator-first workflow (Aer / StatevectorSampler) before hardware, account and AI-tool norms. It closes with how the hardware has changed since 2016, when IBM put the first quantum processor on the cloud (the event's theme). Do NOT promise "by the end of the day you will know…" phrasing on the page. Slide sources: Lanes, Foundations of Quantum Mechanics; IBM Qiskit 101 deck (pathways, two-prompt demo).

## Also in the lab (QGSS 2025 Lab 1, Chapter 1 + CHSH)
- Double slit as a 1-qubit circuit with a phase sweep (the hardware cell, under 1 min), Schrödinger’s cat widget, which-path measurement, CHSH game beating 75%. Teleportation is on Day 6.
- Extra dependencies: ipywidgets, Pillow, `happy.png`/`grumpy.png` from the QGSS 2025 Lab 1 folder.

## Notebook plan
1. Setup: install check, create/save account `clemson-qff-2026` with getpass, verify with `service.backends()`.
2. Bell sanity check (Aer).
3. GHZ: Map → Optimize against a toy coupling map (see the SWAP appear) → Execute (Sampler, Estimator with ZZZ, ZZX, ZII, XXI, ZZI, III) → Post-process (why only ZZI and III are 1).
4. Hardware: GHZ on `least_busy` (formerly Lab 0's bonus).
5. Hello World Bell with EstimatorV2 on hardware.
6. Two-spin Hamiltonian: Sampler histogram, then Estimator energy.
7. Famous experiments: double slit phase sweep (hardware), cat, which-path, CHSH.

## Challenge: Biggest GHZ state
Entangle the most qubits in a GHZ state on hardware. Builds on notebook steps 3–4 (GHZ on a coupling map, then on `least_busy`).
- Raw result: the number of qubits in a GHZ state that passes the verification check.
- TODO: the verification check (for example a fidelity or parity-oscillation threshold), the 0–100 mapping, and a per-attempt job limit so the challenge fits the QPU budget.

## Trims and edits
- Remove `qc_grader` install, `grade_lab0_ex1/ex2`, `check_lab_completion_status`; add asserts on GHZ probabilities and the six expectation values.
- Rename the account; remove the Windows warning about Lab 3.

## Hardware and budget
Three small jobs plus the phase sweep, ~1–1.5 min QPU, plus challenge runs. Cache fallback results for all.

## Open decisions (TODO)
- Session time and room.
- Students create IBM Quantum and qBraid accounts before Monday, November 9 (the event page asks them to); plan a fallback for anyone who arrives without one.
