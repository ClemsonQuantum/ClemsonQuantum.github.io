# Day 2: Real hardware and error correction

Status: **placeholder.** Files to produce here: `notebook.ipynb`, `slides.md` (Marp), `notes.tex`.
Served copies go to `public/files/qff-2026/day-2/qff-day2-real-hardware.ipynb`, `qff-day2-slides.pdf`, `qff-day2-notes.pdf`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

The hardware-craft day: the whole "noise ladder" from suppression to mitigation to detection to correction, every rung run on a real device, with teleportation (moved from the old Day 2) as the bridge into dynamic circuits.

## Sources
- Teleportation: `~/Desktop/Academia/QC Resources/QGSS 25/Lab 1/lab1.ipynb` Chapter 2.2 (3-qubit protocol with `if_test`, verified on Aer statevector).
- Opener on hardware: `QGSS 25/Lab 1/Supplemental_long_range_entanglement_with_limited_qubit_connectivity.ipynb` (SWAP-chain CNOT vs teleported CNOT with feed-forward, dynamical decoupling; ~30 s). ref. arXiv:2308.13065.
- Suppression: `QDC 25/qdc-challenges-2025/day3_tutorials/Track_A/hello_samplomatic/Samplomatic - Hello World.ipynb` §1–3 (Pauli twirling via boxes and annotations). Apache 2.0.
- Detection: `QDC 25/qdc-challenges-2025/day3_tutorials/Track_B/error_detection/error-detection.ipynb` Part 1 (coherent Pauli checks, ideal vs noisy Aer, post-selection). Apache 2.0. ref. arXiv:2504.15725.
- Correction: `QGSS 25/Lab 4/lab4.ipynb` Chapter 2 through the 3-qubit bit-flip code, finished on a real device with an injected X error.
- Rigor thread: tensor products and unitaries (QGSS Lab 1 Chapter 2 framing; Ferris pp. 3–13).

## Seminar (organizers, 45 min)
How IBM’s superconducting processors work; T1, T2, readout error; why transpile (layout, routing, basis gates); multi-qubit states as tensor products, gates as unitaries; the ladder suppression → mitigation → detection → correction; teleportation and feed-forward as the enabler of long-range entanglement. Slide sources: Haas; He, Benchmarking Part I; Javadi, Low-overhead Error Detection; Watrous, QEC Part I.

## Notebook plan
1. Teleportation on Aer, then the long-range CNOT experiment on hardware (SWAP chain vs teleported).
2. Twirling with Samplomatic §1–3, 5-qubit GHZ twirled vs untwirled on hardware.
3. Pauli checks on a Clifford payload (Aer), 5–7 qubit checked GHZ on hardware.
4. Bit-flip code: stabilizers and syndromes on Aer, then on hardware with an injected error.

## Trims and edits
- Opener: derive the qubit line from `least_busy` + coupling map; `channel="ibm_cloud"` → `"ibm_quantum_platform"`; re-verify the dynamic-circuit execution path.
- Samplomatic: test-install early (was pinned to an `executor_preview` runtime branch).
- Error detection: needs `qiskit-device-benchmarking` (git).
- Lab 4: strip graders; keep only Ch. 2 up to the bit-flip code.

## Hardware and budget
Opener ~30 s + three small bookends, 2–3 min QPU total. Cache every result.

## Open decisions (TODO)
- Rungs 2–3 as stations or sequential.
