# Day 6 (Fri Nov 20): Quantum error correction

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-6/qff-day6-error-correction.ipynb`, `qff-day6-slides.pdf`, `qff-day6-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

The closing session. Most of the material comes from the one-week draft's hardware day: detection, correction, teleportation, and the long-range-entanglement opener, every rung run on a real device.

## Sources
- Teleportation: QGSS 2025 Lab 1, `lab1.ipynb` Chapter 2.2 (3-qubit protocol with `if_test`, verified on Aer statevector).
- Opener on hardware: QGSS 2025 Lab 1, `Supplemental_long_range_entanglement_with_limited_qubit_connectivity.ipynb` (SWAP-chain CNOT vs teleported CNOT with feed-forward, dynamical decoupling; ~30 s). ref. arXiv:2308.13065.
- Detection: QDC 2025 challenge repo, `day3_tutorials/Track_B/error_detection/error-detection.ipynb` Part 1 (coherent Pauli checks, ideal vs noisy Aer, post-selection). Apache 2.0. ref. arXiv:2504.15725.
- Correction: QGSS 2025 Lab 4, `lab4.ipynb` Chapter 2 through the 3-qubit bit-flip code, finished on a real device with an injected X error.

## Seminar (speaker TBD, 45 min)
Why a qubit can’t be copied but its information can be spread across many; the bit-flip and repetition codes; syndrome measurement with mid-circuit measurement and feed-forward. Quantum teleportation uses the same trick, and it is how today’s chips build long-range entanglement. It ends with the surface code and what a fault-tolerant processor needs. Slide sources: Javadi, Low-overhead Error Detection; Watrous, QEC Part I.

## Notebook plan
1. Bit-flip code: stabilizers and syndromes on Aer, then the repetition code at distance 3 and 5.
2. Mid-circuit measurement and feed-forward with `if_test`; teleportation on Aer.
3. The long-range CNOT experiment on hardware (SWAP chain vs teleported).
4. Pauli checks on a Clifford payload (Aer), then a 5–7 qubit checked GHZ on hardware.
5. Bit-flip code on hardware with an injected error.

## Challenge: Repetition code
Get the lowest logical error rate on hardware. Builds on notebook steps 1 and 5.
- Raw result: logical error rate on hardware; a lower rate scores higher.
- TODO: the allowed code distances and rounds, how the logical error rate is estimated (shots, decoder), and the 0–100 mapping.

## Trims and edits
- Opener: derive the qubit line from `least_busy` + coupling map; `channel="ibm_cloud"` → `"ibm_quantum_platform"`; re-verify the dynamic-circuit execution path.
- Error detection: needs `qiskit-device-benchmarking` (git).
- Lab 4: strip graders; keep only Ch. 2 up to the bit-flip code.

## Hardware and budget
Opener ~30 s + the checked GHZ + the bit-flip run, plus challenge runs. TBD. Cache every result.

## Open decisions (TODO)
- Speaker.
- Whether error detection (step 4) fits, or moves to "go further".
- Session time and room.
