# Day 4 (Mon Nov 16): Quantum cryptography

Status: **placeholder.** Files to produce here: `notebook.ipynb` (the lecture notes are its markdown cells), `slides.md` (Marp), `challenge/`.
Served copies go to `public/files/qff-2026/day-4/qff-day4-cryptography.ipynb`, `qff-day4-slides.pdf`, `qff-day4-challenge.ipynb`, then the matching chips in `content/events/workshops-and-seminars/qiskit-fall-fest-2026.md` become links.

New session (added when the event moved to six sessions). No adapted source picked yet.

## Sources (candidates)
- The BB84 chapter of the archived Qiskit Textbook (qiskit-community/qiskit-textbook on GitHub), ported to Qiskit 2.x primitives.
- Bennett and Brassard (1984), the original BB84 protocol; Wootters and Zurek (1982), no-cloning.
- NIST post-quantum cryptography standards (FIPS 203, 204, 205) for the closing slides.

## Seminar (speaker TBD, 45 min)
Why measuring a quantum state disturbs it, the no-cloning theorem, and BB84, the protocol that uses those two facts to share a secret key and catch an eavesdropper. The seminar closes on why Shor’s algorithm threatens today’s public-key encryption and what post-quantum cryptography is doing about it.

## Notebook plan
1. Measurement disturbance: prepare |+⟩, measure in Z, then in X; show the second result is no longer certain.
2. No-cloning: show that a CNOT "copy" works for |0⟩ and |1⟩ but entangles instead of copying |+⟩ (assert on the reduced density matrix).
3. BB84 as circuits: random bits and bases for Alice and Bob, sifting, the shared key.
4. Add an intercept-resend eavesdropper and measure the error rate in the sifted key (about 25% when every qubit is intercepted in a random basis); compare with the no-eavesdropper run.
5. Optional: the same protocol on hardware, to show that device noise also raises the error rate.

## Challenge: Catch the eavesdropper
Spot which BB84 key exchanges were intercepted. Builds on notebook step 4.
- Raw result: the number of exchanges correctly called intercepted or clean.
- TODO: generate the challenge data set (exchanges with and without an eavesdropper, with device-level noise so the call is not trivial), decide simulator or hardware for generating it, and the 0–100 mapping.

## Hardware and budget
Single-qubit circuits, so cheap if run on hardware at all; the challenge data can be generated ahead of time. TBD.

## Open decisions (TODO)
- Speaker.
- Session time and room.
