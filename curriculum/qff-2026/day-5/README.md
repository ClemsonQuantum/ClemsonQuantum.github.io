# Day 5 (Wed Nov 18): HPC and quantum machine learning

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-5/qff-day5-hpc-qml.ipynb`, `qff-day5-slides.pdf`, `qff-day5-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

Added 2026-09-07 (it was Day 4 in the one-week draft). No adapted source picked yet; candidates below.

## HPC half: candidates
- Classical simulation at scale: Qiskit Aer `matrix_product_state` method (used in QDC wstate-scattering and hadron-Schwinger for L=15–34 references), `AerSimulator(device="GPU")` where available, statevector memory wall (2^n).
- Quantum-centric supercomputing framing: Robledo Moreno SQD deck; QDC SKQD Part 2 narrative (Serverless, 120 GiB) as a slide-only example; Kandala, Utility Era.
- Clemson angle: run the same Aer MPS job on Clemson’s **Palmetto 2** cluster (SLURM, `python -u`, one conda env) vs a laptop; time it. TODO: confirm Palmetto 2 access for attendees and which partition/GPU.
- Reference numbers: QDC tutorials cite 25 M samples processed in ~4 min with vectorized NumPy vs ~40 min naive (QMOO post-processing) as an HPC-mindset example.

## QML half: candidates
- IBM Quantum Learning course "Quantum machine learning" (new in 2026) for structure: data encoding (angle/amplitude), quantum kernels, variational classifiers, barren plateaus.
- Implementation on the current stack: build the kernel with `StatevectorSampler`/fidelity from `qiskit.quantum_info.Statevector` and feed scikit-learn `SVC(kernel="precomputed")`; avoid the legacy `qiskit-machine-learning` package unless it is confirmed on Qiskit 2.5.
- Hardware step: evaluate the kernel matrix for a tiny dataset (2–4 features, ~20 points) with SamplerV2 on a real device and compare accuracy to the simulator kernel.
- Optional: QGSS 2026 Lab 4b/4c framing of "three pathways to quantum advantage" (Apache 2.0 repo; do not reuse graded solutions).

## Seminar (organizers, 45 min)
High-performance computing for quantum: why simulation is hard (2^n), simulating circuits at scale with tensor networks and GPUs, the quantum-centric supercomputing model in which a classical cluster and a quantum processor share the work, and running large simulations on Palmetto 2. Then quantum machine learning: encoding data into qubits, quantum kernels and variational classifiers, and an honest status report (trainability, data loading, where classical ML still wins).

## Challenge: Quantum kernel classifier
Reach the highest accuracy on a held-out test set. Builds on the QML half.
- Raw result: test-set accuracy.
- TODO: the data set and the train/test split (normalize with training statistics only), whether the kernel must be evaluated on hardware, and the 0–100 mapping.

## Hardware and budget
One small kernel-matrix job, under 1 min, plus challenge runs. Cache results.

## Open decisions (TODO)
- Palmetto 2 access for attendees (accounts, partition, GPU).
- Kernel method vs variational classifier for the QML half.
- Dependencies: scikit-learn; confirm whether any QML package is used at all.
