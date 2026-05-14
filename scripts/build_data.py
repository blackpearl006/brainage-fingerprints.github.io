#!/usr/bin/env python3
"""Convert BrainAge CSV fingerprint data → JSON for the web."""

import json
import pathlib
import pandas as pd

ROOT = pathlib.Path("/Users/ninad/Documents/IISc/BrainAge")
FIGS = ROOT / "3. Figures and tables/indiviual_figure_files"
OUT  = pathlib.Path("/Users/ninad/Documents/IISc/brainage-fingerprints.github.io/public/assets/data")
OUT.mkdir(parents=True, exist_ok=True)

# ── regions.json ─────────────────────────────────────────────
roi_meta = pd.read_csv(ROOT / "8. others/brainnetome_ours.csv")

# For subcortical regions where Our_7network is "NA", fall back to Our_20network label
SUBCORTICAL_MAP = {
    "AmyHip":   "AmyHip",
    "Striatum":  "Striatum",
    "Thalamus":  "Thalamus",
    "AudLang":   "AudLang",
}

regions = []
for _, row in roi_meta.iterrows():
    n7  = str(row["Our_7network"])
    n20 = str(row["Our_20network"])
    # Use network20 label when 7-network is unassigned
    display_net = n7 if n7 != "NA" else SUBCORTICAL_MAP.get(n20, "Subcortical")
    regions.append({
        "id":        int(row["Index"]),
        "label":     str(row["Label"]),
        "subregion": str(row["subregion_name"]),
        "region":    str(row["region"]),
        "network7":  display_net,
        "network20": n20,
        "hemi":      str(row["hemi"]),
    })
(OUT / "regions.json").write_text(json.dumps(regions, indent=2))
print(f"Wrote {len(regions)} regions → regions.json")

# ── fingerprints.json ─────────────────────────────────────────
ANALYSIS_DIRS = {
    "main":         FIGS / "Fig3_Fingerprints_main_cross-sectional/dataset_fingerprints",
    "left_hem":     FIGS / "Fig4_Fingerprints_hemishperical/left_hem_fingerprints",
    "right_hem":    FIGS / "Fig4_Fingerprints_hemishperical/right_hem_fingerprints",
    "female":       FIGS / "Fig5_Fingerprints_sex/female_fingerprints",
    "male":         FIGS / "Fig5_Fingerprints_sex/male_fingerprints",
    "caucasian":    FIGS / "supp/caucaisan_fingerprints",
    "longitudinal": FIGS / "supp/longitudinal_fingerprints",
}
COHORTS    = ["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"]
THRESHOLDS = ["top_20_perc_rois","top_15_perc_rois","top_10_perc_rois","top_5_perc_rois"]

fingerprints = {}
for analysis, directory in ANALYSIS_DIRS.items():
    fingerprints[analysis] = {}
    found = 0
    for cohort in COHORTS:
        counts_file = directory / f"{cohort}_roi_counts.csv"
        sig_file    = directory / f"{cohort}_significant.csv"
        if not counts_file.exists():
            print(f"  MISSING: {counts_file.name}")
            continue
        counts_df = pd.read_csv(counts_file, index_col=0)
        sig_df    = pd.read_csv(sig_file,    index_col=0)
        fingerprints[analysis][cohort] = {}
        for thresh in THRESHOLDS:
            if thresh not in counts_df.index:
                continue
            fingerprints[analysis][cohort][thresh] = {
                "counts": [int(x) for x in counts_df.loc[thresh].tolist()],
                "sig":    [int(x) for x in sig_df.loc[thresh].tolist()],
            }
        found += 1
    print(f"  {analysis}: {found} cohorts")

(OUT / "fingerprints.json").write_text(json.dumps(fingerprints, separators=(",",":")))
size_kb = (OUT / "fingerprints.json").stat().st_size // 1024
print(f"Wrote fingerprints.json ({size_kb} KB)")
