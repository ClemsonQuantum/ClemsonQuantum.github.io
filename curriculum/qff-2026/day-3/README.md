# Day 3: QAOA and VQE

Status: **placeholder.** Files to produce here: `notebook.ipynb`, `slides.md` (Marp), `notes.tex`.
Served copies go to `public/files/qff-2026/day-3/qff-day3-qaoa-vqe.ipynb`, `qff-day3-slides.pdf`, `qff-day3-notes.pdf`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

## Sources
- QAOA: `~/Desktop/Academia/QC Resources/QDC 25/qdc-challenges-2025/challenges/Track_B/qmoo/qmoo_qdc25.ipynb` with `instances/3_regular_static_12q/`, helpers `qmoo_files.py`, `qmoo_plot.py`, `qmoo_utils.py`. Apache 2.0. Pre-computed angles, so no optimization loop to debug in hour one.
- VQE: IBM Quantum Learning course "Variational algorithm design" / "Quantum chemistry with VQE" pattern with `EstimatorV2` (avoid the legacy `qiskit_algorithms.VQE` used by BasQ `challenge_1_tutorial.ipynb`; that notebook is CC BY 4.0 and fine as a "go further" link). H2 in STO-3G is 4 qubits; a hand-built `SparsePauliOp` for H2 at 0.735 Å avoids the pyscf install.
- Go further: BasQ `challenge_2_tutorial.ipynb` (QAOA with COBYLA), IBM QAOA tutorial (22 min QPU as written; do not run on hardware).

## Seminar (guest, 45 min)
Variational algorithms (Cerezo taxonomy), Max-Cut → Ising, the QAOA ansatz and p, why pre-trained angles work, VQE and the variational principle, ground-state energy of H2, why hybrid methods run on today’s processors, reading answers out of noisy samples. Slide sources: Fraxanet, Practical Quantum Algorithms and Practical Quantum Techniques; Kandala, Utility Era (VQE history: Kandala 2017).

## Notebook plan
1. Max-Cut on `problem_graph_0.json` → cost operator → `qaoa_ansatz` with shipped angles → transpile → SamplerV2 on hardware → cut values vs brute force. Optional: multi-objective Pareto front and `moocore.hypervolume`.
2. VQE for H2: `SparsePauliOp` Hamiltonian, a 2–4 parameter ansatz, `StatevectorEstimator` + SciPy COBYLA on the simulator, then one EstimatorV2 evaluation of the optimized state on hardware; compare to `eigvalsh` and chemical accuracy (1.6 mHa).

## Trims and edits
- QMOO: remove grader, 80-qubit challenge, `qaoa_training_pipeline`, cvxpy detour.
- Dependencies: networkx, rustworkx, moocore, qiskit-addon-opt-mapper, scipy.

## Hardware and budget
Seconds for QAOA samples plus one 4-qubit Estimator job for VQE, well under 1 min. Cache results.

## Open decisions (TODO)
- Keep the multi-objective hour or spend it on VQE.
