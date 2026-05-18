"""Copy + downsample preprocessing NIfTIs for the website.

For files >~2 MB we spatially downsample by 2× and cast to int16 (or uint8 for
masks/labels) so the browser does not have to fetch 30–40 MB volumes.

Early-stage volumes (raw, bias-corrected, robust) still contain facial
features. Before shipping them publicly we apply a simple coordinate-based
defacing — the anterior-inferior region (where the face sits in RAS+ space)
is smoothly zeroed-out while the brain and surrounding skull are preserved."""

from pathlib import Path
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter

SRC = Path("/Users/ninad/Documents/IISc/VAL/Documents/preprocessing-FSL-ninad")
DST = Path("/Users/ninad/Documents/IISc/brainage-fingerprints.github.io/public/assets/preprocessing")
DST.mkdir(parents=True, exist_ok=True)

# (src_name, dst_name, downsample_factor, dtype, is_label, deface)
JOBS = [
    ("ninad.nii.gz",                   "raw.nii.gz",              2, "int16", False, True),
    ("ninad_bias.nii.gz",              "bias_corrected.nii.gz",   2, "int16", False, True),
    ("ninad_robust.nii.gz",            "robust.nii.gz",           2, "int16", False, True),
    ("ninad_brain.nii.gz",             "brain.nii.gz",            2, "int16", False, False),
    ("ninad_linreg_12dof_2mm.nii.gz",  "linreg_12dof_2mm.nii.gz", 1, "int16", False, False),
    ("ninad_seg_pveseg.nii.gz",        "seg_pveseg.nii.gz",       1, "uint8", True,  False),
    ("ninad_seg_pve_0.nii.gz",         "seg_pve_csf.nii.gz",      1, "uint8", False, False),
    ("ninad_seg_pve_1.nii.gz",         "seg_pve_gm.nii.gz",       1, "uint8", False, False),
    ("ninad_seg_pve_2.nii.gz",         "seg_pve_wm.nii.gz",       1, "uint8", False, False),
    ("ninad_wm_mask.nii.gz",           "wm_mask.nii.gz",          1, "uint8", True,  False),
    ("ninad_just_white_matter.nii.gz", "wm_t1.nii.gz",            1, "int16", False, False),
    ("ninad_normalised.nii.gz",        "normalised.nii.gz",       1, "int16", False, False),
]


def deface_in_ras(data_ras):
    """Smoothly zero out the anterior-inferior region in a RAS+ volume.

    Axes (after as_closest_canonical):
        axis 0 : L → R
        axis 1 : P → A   (anterior = high index)
        axis 2 : I → S   (superior = high index)
    Face is anterior + inferior. We keep the brain and surrounding skull by:
      - finding the head extent via 10%-of-max thresholding
      - identifying a "face wedge" of voxels in the anterior 35 mm AND lower
        55 % of the head's vertical extent
      - blurring the wedge mask for a smooth falloff so the cut is not visible
        as a sharp rectangle in the rendered slices.
    """
    head = data_ras > 0.10 * data_ras.max()
    if not head.any():
        return data_ras
    coords = np.argwhere(head)
    y_max = coords[:, 1].max()
    z_min = coords[:, 2].min()
    z_max = coords[:, 2].max()

    ny, nz = data_ras.shape[1], data_ras.shape[2]
    y_grid = np.arange(ny).reshape(-1, 1)
    z_grid = np.arange(nz).reshape(1, -1)

    # voxel size in mm along Y (anterior); assume ~1 mm if unknown
    anterior_depth_vox = 55   # ~55 mm wedge from the anterior edge
    z_cut = z_min + 0.68 * (z_max - z_min)

    in_face = (y_grid > (y_max - anterior_depth_vox)) & (z_grid < z_cut)
    face_soft = gaussian_filter(in_face.astype(np.float32), sigma=4.5)
    keep_yz = 1.0 - np.clip(face_soft, 0.0, 1.0)

    return data_ras * keep_yz[None, :, :]


def process(src, dst, factor, dtype, is_label, deface):
    img = nib.load(str(src))

    if deface:
        img_ras = nib.as_closest_canonical(img)
        data_ras = img_ras.get_fdata()
        data_ras = deface_in_ras(data_ras)
        img = nib.Nifti1Image(data_ras.astype(np.float32), img_ras.affine)

    data = img.get_fdata()
    affine = img.affine.copy()

    if factor > 1:
        if is_label:
            data = data[::factor, ::factor, ::factor]
        else:
            sx, sy, sz = (s - s % factor for s in data.shape)
            data = data[:sx, :sy, :sz]
            data = data.reshape(sx // factor, factor,
                                sy // factor, factor,
                                sz // factor, factor).mean(axis=(1, 3, 5))
        affine[:3, :3] *= factor

    if dtype == "uint8":
        if is_label:
            arr = data.astype(np.uint8)
        else:
            d = data.astype(np.float32)
            d = (d - d.min()) / max(d.max() - d.min(), 1e-6) * 255.0
            arr = d.astype(np.uint8)
    else:  # int16
        d = data.astype(np.float32)
        d = (d - d.min()) / max(d.max() - d.min(), 1e-6) * 32000.0
        arr = d.astype(np.int16)

    out = nib.Nifti1Image(arr, affine)
    nib.save(out, str(dst))


for src_name, dst_name, factor, dtype, is_label, deface in JOBS:
    src = SRC / src_name
    dst = DST / dst_name
    process(src, dst, factor, dtype, is_label, deface)
    tag = "[deface]" if deface else "        "
    print(f"  {tag} {src_name:40s} -> {dst_name:28s} {dst.stat().st_size/1024:7.1f} KB")
