# Site Roadmap — Ambitious 10

> **Strategic note:** If you ship only one thing, ship #1 (interactive atlas) — it's what the domain name brainage-fingerprints promises.
> **MVP = #1 + #2 + #3.** Add #5 and #10 if you want the site to become a citable resource rather than just a paper companion.

---

## 1. Interactive 3D Atlas of the 26 Universal Biomarkers ✦ must-have

Rotatable 3D brain; each of the 26 ROIs is hover-clickable showing anatomical name, Yeo network, cohort occurrence bars, and a toggle for universal / sex / hemisphere sets. Built with NiiVue.

- **Effort:** ~3 days
- **Tech:** NiiVue

---

## 2. Browser-Based Brain-Age Calculator (privacy-preserving)

Upload a preprocessed NIfTI → brain age + IG map in-browser via ONNX.js. Nothing leaves the user's machine. 2.95M-param SFCN fits trivially.

- **Effort:** ~3–5 days
- **Tech:** ONNX.js

---

## 3. Reproducibility Hub (Lancet/JAMA gatekeeper item)

Model weights (50 checkpoints), Dockerfile, training seeds, split lists per cohort, LRD coefficients, Brainnetome→Yeo mapping CSV, environment.yml. Link the Zenodo DOI.

- **Effort:** ~1–2 days
- **Tech:** Zenodo DOI

---

## 4. Cross-Population Fingerprint Browser

8 cohorts × 20 networks grid; click a cell → ROI-level bar plot for that cohort × network. Second tab for sex/hemisphere configs.

- **Effort:** ~4 days
- **Tech:** D3.js

---

## 5. Method Walkthrough — Integrated Gradients in 4 Steps

Scroll-driven explainer (distill.pub style): baseline image → linear path → gradient accumulation → 50-model consensus + binomial test. Uses a real OASIS-3 subject.

- **Effort:** ~1 week
- **Tech:** Scroll-driven animation

---

## 6. "Your Brain Age in Context" Distribution Viewer

After using the calculator, show a violin plot of BAG distribution per cohort with your value overlaid. BAG percentile per cohort. Prominent "not a clinical tool" disclaimer.

- **Effort:** ~2–3 days
- **Tech:** D3 / Observable Plot

---

## 7. Bias-Correction Interactive Demo

Scatter of brain-age delta vs chronological age; dropdown to flip between NBC / LRPA / LRD / PRPA / LRPAS. Regression line and MAE update live. Cuts reviewer rebuttals to a hyperlink.

- **Effort:** ~2–3 days
- **Tech:** D3 / Observable Plot

---

## 8. Cohort Dashboard / "Meet the 3,569 Subjects"

Interactive Table S1 + age distributions + scanner profiles, filterable by population, age, sex. Click cohort → cohort page with participant-flow diagram.

- **Effort:** ~3–4 days
- **Tech:** D3 / React

---

## 9. Plain-Language Press Kit

200-word lay summary, punchline figure (downloadable PNG/PDF), author quote, calculator + atlas links, media contact, and a "what this study does NOT show" subsection.

- **Effort:** ~1 day
- **Tech:** Static HTML/Markdown

---

## 10. Model Card + Limitations Page

Mitchell et al. (2019) format: intended use, out-of-scope use, training data composition, per-population fairness audits, known failure modes, recommended re-calibration procedure.

- **Effort:** ~1–2 days
- **Tech:** Static page

---

## Tech Stack

| Item | Tech |
|------|------|
| Hosting | GitHub Pages |
| 3D Atlas (#1) | NiiVue |
| Brain-Age Calculator (#2) | ONNX.js |
| Data / Weights (#3) | Zenodo |
| Charts (#4, #6, #7) | D3.js / Observable Plot |
| Framework | React + Vite (current) |

All free — no backend needed.
