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
summary: "Poster on methods for synthesizing quantum circuits that are optimized for specific hardware constraints (gate set, connectivity, noise characteristics)."
image: "/images/hardware-aware-qcs-poster.webp"
pdf: "/files/hardware-aware-qcs-paper.pdf"
link: "https://ci.clemson.edu/showcase/posters/"
---

## Abstract

Effectively leveraging quantum computing requires generating and manipulating a desired quantum state using a quantum circuit. Quantum circuit synthesis (QCS) is bottlenecked by the exponential complexity of circuit verification via quantum simulation. Diffusion models are promising QCS candidates, because they circumvent quantum simulation during training. Existing diffusion-based QCS models demonstrate success for unconstrained circuits, but prove insufficient for producing hardware topology-constrained circuits, a common restriction for modern quantum machines. This work introduces a novel hardware-aware conditioning framework that enables topology-constrained QCS. Our approach delivers up to 8x higher success rate compared to the baseline for a state-of-the-art hardware-agnostic QCS model, proving the necessity for hardware-aware QCS.

This work was supported by the Clemson University Creative Inquiry + Undergraduate Research Program, the South Carolina Quantum Association, and U.S. NSF Grant OAC-2518605.
