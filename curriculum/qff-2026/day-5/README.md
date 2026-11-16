# Day 5 (Fri Nov 20): Real hardware, noise, and error correction

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-5/qff-day5-hardware-noise.ipynb`, `qff-day5-slides.pdf`, `qff-day5-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

The hardware-craft day, and now the error correction day too: what a real processor does to a circuit, suppressing and mitigating errors so a noisy processor's answers land closer to the ideal ones, then detecting and correcting them. Every circuit runs on a simulator and on an IBM processor, and the lab compares the two.

Merged on 2026-11-10, when the event moved to one week (Mon–Fri, November 16–20), and moved the same day from Day 2 to Day 5, the closing session. This sheet now also holds the former Day 6 (quantum error correction), so it carries two sessions of material for a one-hour slot; see "Open decisions" for what has to be cut. The former Day 6 sheet is in git history at `curriculum/qff-2026/day-6/README.md`.

## Sources
Hardware, noise, and mitigation:
- Suppression: QDC 2025 challenge repo, `day3_tutorials/Track_A/hello_samplomatic/Samplomatic - Hello World.ipynb` §1–3 (Pauli twirling via boxes and annotations). Apache 2.0.
- Transpilation: IBM documentation on the transpiler and `generate_preset_pass_manager` (layout, routing, basis gates, optimization levels).
- Mitigation: readout-error mitigation through the `EstimatorV2` resilience options (IBM documentation).
- Rigor thread: tensor products and unitaries (QGSS 2025 Lab 1 Chapter 2 framing; Ferris pp. 3–13).

Error correction (the former Day 6):
- Correction: QGSS 2025 Lab 4, `lab4.ipynb` Chapter 2 through the 3-qubit bit-flip code, finished on a real device with an injected X error.
- Teleportation: QGSS 2025 Lab 1, `lab1.ipynb` Chapter 2.2 (3-qubit protocol with `if_test`, verified on Aer statevector).
- Opener on hardware: QGSS 2025 Lab 1, `Supplemental_long_range_entanglement_with_limited_qubit_connectivity.ipynb` (SWAP-chain CNOT vs teleported CNOT with feed-forward, dynamical decoupling; ~30 s). ref. arXiv:2308.13065.
- Detection: QDC 2025 challenge repo, `day3_tutorials/Track_B/error_detection/error-detection.ipynb` Part 1 (coherent Pauli checks, ideal vs noisy Aer, post-selection). Apache 2.0. ref. arXiv:2504.15725.

## Seminar (organizers, 45 min)
How IBM’s superconducting processors work; T1, T2, readout error; why circuits are transpiled before they run (layout, routing, basis gates); the math for the day, multi-qubit states as tensor products and gates as unitary matrices; suppressing and mitigating errors. Then error correction: why a qubit can’t be copied but its information can be spread across many; the bit-flip and repetition codes; syndrome measurement with mid-circuit measurement and feed-forward. It ends with the surface code and what a fault-tolerant processor needs. Slide sources: Haas; He, Benchmarking Part I; Javadi, Low-overhead Error Detection; Watrous, QEC Part I.

The event page's Day 5 text follows this outline. It no longer mentions teleportation or long-range entanglement (the former Day 6 seminar did), so add a sentence there if either stays in the session.

## Notebook plan
Hardware, noise, and mitigation:
1. Tensor products and unitaries on small examples (`Statevector`, `Operator`), with asserts.
2. Transpile one circuit for a real backend at each optimization level; count two-qubit gates and depth, and run the best one on the simulator and on hardware.
3. Readout error: measure prepared basis states on hardware, then turn on readout mitigation in `EstimatorV2` and compare with the ideal value.
4. Twirling with Samplomatic §1–3: 5-qubit GHZ twirled vs untwirled on hardware.

Error correction (the former Day 6 plan, in its original order):
5. Bit-flip code: stabilizers and syndromes on Aer, then the repetition code at distance 3 and 5.
6. Mid-circuit measurement and feed-forward with `if_test`; teleportation on Aer.
7. The long-range CNOT experiment on hardware (SWAP chain vs teleported).
8. Pauli checks on a Clifford payload (Aer), then a 5–7 qubit checked GHZ on hardware.
9. Bit-flip code on hardware with an injected error.

## Challenge: Transpile golf
Fit a given circuit onto an IBM processor’s layout with the fewest two-qubit gates, then run it there with error mitigation. Builds on notebook steps 2–3.
- Raw result: two-qubit gate count after transpilation; the mitigated result breaks ties.
- TODO: the given circuit, how the mitigated result is scored, and the 0–100 mapping.

The former Day 6 challenge (Repetition code: lowest logical error rate on hardware) was dropped with the merge, so the event has five challenges.

## Trims and edits
- Samplomatic: test-install early (was pinned to an `executor_preview` runtime branch).
- Opener: derive the qubit line from `least_busy` + coupling map; `channel="ibm_cloud"` → `"ibm_quantum_platform"`; re-verify the dynamic-circuit execution path.
- Error detection: needs `qiskit-device-benchmarking` (git).
- Lab 4: strip graders; keep only Ch. 2 up to the bit-flip code.

## Hardware and budget
TBD: one transpiled circuit, the readout bookends, and the twirled GHZ pair, then the bit-flip run (plus the ~30 s opener and the checked GHZ if they stay), plus challenge runs. Cache every result.

## Open decisions (TODO)
- What fits in one hour. Steps 1–9 were planned as two sessions; candidates to move to "go further": teleportation (step 6), the long-range CNOT (step 7), and error detection (step 8).
- Whether zero-noise extrapolation gets a demo cell (it multiplies executions).
