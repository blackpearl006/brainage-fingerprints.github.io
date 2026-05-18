"""
Generate downsampled 3D brain voxel grids at multiple resolutions
matching each SFCN stage's spatial dimensions. Output is dense JSON
for fast loading and InstancedMesh rendering in Three.js.
"""
import nibabel as nib
import numpy as np
import json
from pathlib import Path

NII     = "/Users/ninad/Documents/IISc/VAL/Documents/preprocessing-FSL-ninad/ninad_normalised.nii.gz"
OUT_DIR = Path(__file__).parent.parent / "public" / "assets" / "features"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Visualisation resolutions — proportionally scaled from real SFCN dims
# Real:  91×109×91 → 45×54×45 → 22×27×22 → 11×13×11 → 5×6×5 → 2×3×2
# Vis:   15×18×15 →  9×11×9  → 7×8×7    → 5×6×5    → 3×4×3 → 2×3×2
RESOLUTIONS = {
    "input": (15, 18, 15),
    "conv1": (9,  11, 9),
    "conv2": (7,  8,  7),
    "conv3": (5,  6,  5),
    "conv4": (3,  4,  3),
    "conv5": (2,  3,  2),
}

# Load brain
vol = nib.load(NII).get_fdata()      # (91, 109, 91)

# Normalise to 0-255
mask     = vol > 0
lo, hi   = np.percentile(vol[mask], [3, 97])
vol_norm = np.clip(vol, lo, hi)
vol_norm = ((vol_norm - lo) / (hi - lo) * 255).astype(np.uint8)


def downsample(arr, target_shape):
    """Average-pool downsample with cropping to be divisible."""
    factors      = [max(1, s // t) for s, t in zip(arr.shape, target_shape)]
    cropped      = tuple(t * f for t, f in zip(target_shape, factors))
    arr_cropped  = arr[:cropped[0], :cropped[1], :cropped[2]]
    reshaped     = arr_cropped.reshape(
        target_shape[0], factors[0],
        target_shape[1], factors[1],
        target_shape[2], factors[2],
    )
    return reshaped.mean(axis=(1, 3, 5)).astype(np.uint8)


for name, target_shape in RESOLUTIONS.items():
    ds = downsample(vol_norm, target_shape)
    # Store as flat array in [x][y][z] order: idx = x*Y*Z + y*Z + z
    flat = ds.flatten().tolist()
    payload = {
        "shape": list(target_shape),
        "data":  flat,
    }
    out_path = OUT_DIR / f"voxels_{name}.json"
    with open(out_path, "w") as f:
        json.dump(payload, f)
    n_nz = int(np.sum(ds > 40))
    print(f"  voxels_{name:6s}  shape={tuple(target_shape)}  nonzero={n_nz:>4d}/{ds.size:<4d}  → {out_path.stat().st_size/1024:.1f} KB")

print(f"\nDone — saved to {OUT_DIR}")
