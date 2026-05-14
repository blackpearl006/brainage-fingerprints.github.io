#!/usr/bin/env python3
"""Generate per-cohort glass brain PNG images for the website 2D view."""

import json
import pathlib
import numpy as np
import nibabel as nib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from nilearn import plotting

ROOT     = pathlib.Path("/Users/ninad/Documents/IISc/BrainAge")
ATLAS    = pathlib.Path("/Users/ninad/Documents/IISc/perfusion/scripts/preprocessing/brainnetome_atlas.nii.gz")
FIGS     = ROOT / "3. Figures and tables/indiviual_figure_files"
OUT      = pathlib.Path("/Users/ninad/Documents/IISc/brainage-fingerprints.github.io/public/assets/figures")
OUT.mkdir(parents=True, exist_ok=True)

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
THRESHOLD  = "top_20_perc_rois"

atlas_img  = nib.load(ATLAS)
atlas_data = atlas_img.get_fdata()

def roi_to_volume(counts, sig, affine, shape):
    """Map per-ROI count values to voxel space, masking by significance."""
    vol = np.zeros(shape, dtype=np.float32)
    for i, (count, s) in enumerate(zip(counts, sig)):
        roi_id = i + 1
        if s == 1 and count > 0:
            vol[atlas_data == roi_id] = float(count)
    return nib.Nifti1Image(vol, affine)

BG_COLOR  = "#1A2332"
SIG_CMAP  = "hot"         # cream → yellow → red
THRESHOLD_VAL = 0.5       # show voxels above this

total = 0
for analysis, directory in ANALYSIS_DIRS.items():
    for cohort in COHORTS:
        counts_f = directory / f"{cohort}_roi_counts.csv"
        sig_f    = directory / f"{cohort}_significant.csv"
        if not counts_f.exists():
            print(f"  skip {cohort}/{analysis}")
            continue

        import pandas as pd
        counts_df = pd.read_csv(counts_f, index_col=0)
        sig_df    = pd.read_csv(sig_f,    index_col=0)
        if THRESHOLD not in counts_df.index:
            continue

        counts = [int(x) for x in counts_df.loc[THRESHOLD].tolist()]
        sig    = [int(x) for x in sig_df.loc[THRESHOLD].tolist()]

        stat_img = roi_to_volume(counts, sig, atlas_img.affine, atlas_img.shape)
        sig_count = sum(sig)

        fig, ax = plt.subplots(figsize=(10, 3.5), facecolor=BG_COLOR)
        ax.set_facecolor(BG_COLOR)

        display = plotting.plot_glass_brain(
            stat_img,
            axes=ax,
            colorbar=True,
            threshold=THRESHOLD_VAL,
            cmap=SIG_CMAP,
            vmin=1,
            vmax=max(1, max(counts)),
            annotate=False,
            title=None,
            black_bg=True,
            display_mode="ortho",
            figure=fig,
        )

        # Title overlay
        ax.text(0.02, 0.96, f"{cohort}  ·  {analysis.replace('_',' ')}",
                transform=ax.transAxes, color="white",
                fontsize=9, fontfamily="monospace", va="top")
        ax.text(0.02, 0.06, f"{sig_count} significant ROIs  ·  top-20%",
                transform=ax.transAxes, color="#C8312B",
                fontsize=8, fontfamily="monospace", va="bottom")

        out_path = OUT / f"{cohort}_{analysis}.png"
        plt.savefig(out_path, dpi=120, bbox_inches="tight",
                    facecolor=BG_COLOR, edgecolor="none")
        plt.close(fig)
        total += 1
        print(f"  ✓  {cohort}_{analysis}.png  ({sig_count} sig ROIs)")

print(f"\nGenerated {total} images → {OUT}")
