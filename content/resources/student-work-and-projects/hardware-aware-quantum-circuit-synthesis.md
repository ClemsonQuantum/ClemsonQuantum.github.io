---
title: "Hardware-Aware Quantum Circuit Synthesis"
date: 2025-06-15
type: poster
authors:
  - name: "Toby Cox"
  - name: "Ian Lewis"
  - name: "Nathan Jones"
  - name: "Akhilesh Bondapalli"
mentors:
  - "Rong Ge"
summary: "Poster on hardware-aware quantum circuit synthesis: a diffusion-model framework that builds circuits fitting a quantum processor’s qubit connectivity, with up to 8× the success rate of a hardware-agnostic baseline."
image: "/images/hardware-aware-qcs-poster.webp"
pdf: "/files/hardware-aware-qcs-paper.pdf"
pdf_label: paper
---

## Abstract

Effectively leveraging quantum computing requires generating and manipulating a desired quantum state using a quantum circuit. Quantum circuit synthesis (QCS) is bottlenecked by the exponential complexity of circuit verification via quantum simulation. Diffusion models are promising QCS candidates, because they circumvent quantum simulation during training. Existing diffusion-based QCS models demonstrate success for unconstrained circuits, but prove insufficient for producing hardware topology-constrained circuits, a common restriction for modern quantum machines. This work introduces a novel hardware-aware conditioning framework that enables topology-constrained QCS. Our approach delivers up to 8× higher success rate compared to the baseline for a state-of-the-art hardware-agnostic QCS model, proving the necessity for hardware-aware QCS.

This work was supported by the Clemson University Creative Inquiry + Undergraduate Research Program, the South Carolina Quantum Association, and U.S. NSF Grant OAC‑2518605.
