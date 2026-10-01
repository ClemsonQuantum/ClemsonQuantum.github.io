# Day 2 (Wed Nov 11): Hardware, noise, and error mitigation

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-2/qff-day2-hardware-noise.ipynb`, `qff-day2-slides.pdf`, `qff-day2-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

The hardware-craft day: what a real processor does to a circuit, and the first steps toward error correction (suppressing and mitigating errors so a noisy processor's answers land closer to the ideal ones). Every circuit runs on a simulator and on an IBM processor, and the lab compares the two. Detection and correction, teleportation, and the long-range-entanglement opener moved to Day 6.

## Sources
- Suppression: QDC 2025 challenge repo, `day3_tutorials/Track_A/hello_samplomatic/Samplomatic - Hello World.ipynb` §1–3 (Pauli twirling via boxes and annotations). Apache 2.0.
- Transpilation: IBM documentation on the transpiler and `generate_preset_pass_manager` (layout, routing, basis gates, optimization levels).
- Mitigation: readout-error mitigation through the `EstimatorV2` resilience options (IBM documentation).
- Rigor thread: tensor products and unitaries (QGSS 2025 Lab 1 Chapter 2 framing; Ferris pp. 3–13).

## Seminar (organizers, 45 min)
How IBM’s superconducting processors work; T1, T2, readout error; why circuits are transpiled before they run (layout, routing, basis gates); the math for the day, multi-qubit states as tensor products and gates as unitary matrices; suppressing and mitigating errors. Slide sources: Haas; He, Benchmarking Part I.

## Notebook plan
1. Tensor products and unitaries on small examples (`Statevector`, `Operator`), with asserts.
2. Transpile one circuit for a real backend at each optimization level; count two-qubit gates and depth, and run the best one on the simulator and on hardware.
3. Readout error: measure prepared basis states on hardware, then turn on readout mitigation in `EstimatorV2` and compare with the ideal value.
4. Twirling with Samplomatic §1–3: 5-qubit GHZ twirled vs untwirled on hardware.

## Challenge: Transpile golf
Fit a given circuit onto an IBM processor’s layout with the fewest two-qubit gates, then run it there with error mitigation. Builds on notebook steps 2–3.
- Raw result: two-qubit gate count after transpilation; the mitigated result breaks ties.
- TODO: the given circuit, how the mitigated result is scored, and the 0–100 mapping.

## Trims and edits
- Samplomatic: test-install early (was pinned to an `executor_preview` runtime branch).

## Hardware and budget
TBD: one transpiled circuit, the readout bookends, and the twirled GHZ pair, plus challenge runs. Cache every result.

## Open decisions (TODO)
- Whether zero-noise extrapolation gets a demo cell (it multiplies executions).
- Session time and room.
