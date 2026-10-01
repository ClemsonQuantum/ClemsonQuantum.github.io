# Day 3 (Fri Nov 13): Quantum algorithms (Grover, QFT, QAOA, VQE)

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-3/qff-day3-algorithms.ipynb`, `qff-day3-slides.pdf`, `qff-day3-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

## Sources
- Grover and QFT: TBD. Candidate: IBM Quantum Learning, "Fundamentals of quantum algorithms" (Grover's algorithm; phase estimation and factoring), rebuilt on the current primitives.
- QAOA: QDC 2025 challenge repo, `challenges/Track_B/qmoo/qmoo_qdc25.ipynb` with `instances/3_regular_static_12q/`, helpers `qmoo_files.py`, `qmoo_plot.py`, `qmoo_utils.py`. Apache 2.0. Pre-computed angles, so no optimization loop to debug in the first hour.
- VQE: IBM Quantum Learning course "Variational algorithm design" / "Quantum chemistry with VQE" pattern with `EstimatorV2` (avoid the legacy `qiskit_algorithms.VQE` used by BasQ `challenge_1_tutorial.ipynb`; that notebook is CC BY 4.0 and fine as a "go further" link). H2 in STO-3G is 4 qubits; a hand-built `SparsePauliOp` for H2 at 0.735 Å avoids the pyscf install.
- Go further: BasQ `challenge_2_tutorial.ipynb` (QAOA with COBYLA), IBM QAOA tutorial (22 min QPU as written; do not run on hardware).

## Seminar (guest, speaker TBD, 45 min)
First the textbook algorithms: Grover’s search (a marked item in an unsorted list with quadratically fewer queries) and the quantum Fourier transform, the building block behind phase estimation and Shor’s algorithm. Then the variational ones running on today’s processors: Max-Cut → Ising Hamiltonian, the QAOA ansatz and p, why pre-trained angles work, VQE and the variational principle, the ground-state energy of H2. Hybrid quantum-classical methods suit noisy hardware, and the lab shows how to read a good answer out of noisy samples. Slide sources: Fraxanet, Practical Quantum Algorithms and Practical Quantum Techniques; Kandala, Utility Era (VQE history: Kandala 2017).

## Notebook plan
1. Grover on 2–3 qubits (simulator): oracle, diffuser, the optimal number of iterations, success probability vs iterations.
2. QFT on a few qubits (simulator), checked against `np.fft` up to the sign and normalization convention (state which one).
3. Max-Cut on `problem_graph_0.json` (12 nodes) → cost operator → `qaoa_ansatz` with shipped angles → transpile → SamplerV2 on hardware → cut values vs brute force.
4. VQE for H2: `SparsePauliOp` Hamiltonian, a 2–4 parameter ansatz, `StatevectorEstimator` + SciPy COBYLA on the simulator, then one EstimatorV2 evaluation of the optimized state on hardware; compare to `eigvalsh` and chemical accuracy (1.6 mHa).

## Challenge: Max-Cut with QAOA
Find the best cut of a 12-node graph from samples taken on hardware. Builds on notebook step 3.
- Raw result: the best cut value found in the submitted hardware samples.
- TODO: the graph (a held-back instance, not `problem_graph_0`), whether angles may be re-optimized, and the 0–100 mapping (for example the ratio to the brute-force optimum).

## Trims and edits
- QMOO: remove grader, 80-qubit challenge, `qaoa_training_pipeline`, cvxpy detour; the multi-objective Pareto front is optional.
- Dependencies: networkx, rustworkx, moocore, qiskit-addon-opt-mapper, scipy.

## Hardware and budget
Seconds for QAOA samples plus one 4-qubit Estimator job for VQE, well under 1 min, plus challenge runs. Grover and QFT stay on the simulator. Cache results.

## Open decisions (TODO)
- Grover and QFT sources.
- How much time the four topics get in one lab.
