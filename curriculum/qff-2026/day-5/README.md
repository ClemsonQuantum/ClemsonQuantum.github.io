# Day 5: Frontier research on today’s hardware

Status: **placeholder.** Files to produce here: `notebook.ipynb`, `slides.md` (Marp), `notes.tex`.
Served copies go to `public/files/qff-2026/day-5/qff-day5-frontier-research.ipynb`, `qff-day5-slides.pdf`, `qff-day5-notes.pdf`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

The hardest day and the most recent science (2025 papers). Two halves, both reduced to Open Plan scale.

## Sources
- Half A: `~/Desktop/Academia/QC Resources/QDC 25/qdc-challenges-2025/challenges/Track_A/Z2-LGT/Z2-LGT_qdc25_kingston.ipynb` trimmed to one plaquette (~11 qubits). Real-time dynamics of a (2+1)-D Z2 lattice gauge theory on heavy-hex, after arXiv:2507.08088 (Cobos, Fraxanet). Apache 2.0. Needs `lattice_utils.py`.
- Half B: `~/Desktop/Academia/QC Resources/QDC 25/qdc-challenges-2025/challenges/Track_A/skqd/skqd_challenge.ipynb` Part 1 (12-qubit perturbed TFIM, Krylov circuits from `PauliEvolutionGate` + `LieTrotter`, `solve_qubit`), after arXiv:2501.09702. Apache 2.0. Needs `skqd_helpers.py` (imports `qiskit_addon_sqd`, `ffsim`). Alternative with no extra dependencies: IBM’s own "Sample, Then Diagonalize" notebook (QFF26/Challenges), TFIM n=8, GHZ+RY guess circuit, subspace diagonalization.

## Seminar (guest, 45 min)
Where the field is now: utility-scale simulation, Trotterized dynamics of gauge theories, why ground states concentrate on few configurations, sample-based (Krylov) diagonalization and configuration recovery, quantum-centric supercomputing. Slide sources: Robledo Moreno, SQD deep dive; Ferris pp. 32–41; Kandala, Utility Era; one Rall roadmap slide to close.

## Notebook plan
1. Half A: build the Z2-Higgs Hamiltonian on one plaquette, hand-scheduled CX layers vs the `PauliEvolutionGate` shortcut, 6–8 Trotter steps, raw EstimatorV2 on hardware, compare to an Aer statevector run.
2. Half B: TFIM as `SparsePauliOp` (asserted Pauli list), Krylov circuits, sample on Aer and then on hardware (r≈5 circuits, 12 qubits), `solve_qubit`, compare to `eigvalsh`. Or the IBM SQD notebook with a hardware sampling step.
3. Informal closing discussion: everyone shares what they learned over the week (no presentations, no judging).

## Trims and edits
- Z2: REWRITE the credential cell (source has a plaintext token); drop ZNE, twirling, the Gauss-law bonus, and the 2x2 benchmark file.
- SKQD: keep Part 1 only (Part 2 needs Qiskit Serverless); remove `qc_grader`; the existing assert cells stay.
- If the `ffsim`/`qiskit_addon_sqd` install is a problem in the room, use IBM’s SQD notebook for Half B (pure Qiskit).

## Hardware and budget
Two small jobs, ~1–2 min QPU total. Cache both results.

## Open decisions (TODO)
- SKQD Part 1 vs IBM’s SQD notebook for Half B.
