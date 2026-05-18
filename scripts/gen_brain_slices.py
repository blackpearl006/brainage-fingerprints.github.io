"""
Generate brain slice PNGs from ninad_normalised.nii.gz for the SFCNExplainer carousel.
Output: public/assets/slices/{axial,coronal,sagittal}_{i}.png
"""
import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

NII_PATH = "/Users/ninad/Documents/IISc/VAL/Documents/preprocessing-FSL-ninad/ninad_normalised.nii.gz"
OUT_DIR  = Path(__file__).parent.parent / "public" / "assets" / "slices"
OUT_DIR.mkdir(parents=True, exist_ok=True)

IMG_SIZE = 192   # output PNG size (square)
BG_COLOR = (10, 15, 26)   # #0a0f1a — dark navy

# Load and normalise
vol = nib.load(NII_PATH).get_fdata()          # (91, 109, 91)
mask = vol > 0
lo, hi = np.percentile(vol[mask], [2, 98])
vol = np.clip(vol, lo, hi)
vol = ((vol - lo) / (hi - lo) * 255).astype(np.uint8)

def make_png(arr2d, plane_label, idx, total):
    """arr2d: 2D numpy array (not necessarily square), saved as grey on dark bg."""
    # Flip to standard radiological orientation
    arr2d = np.rot90(arr2d)

    h, w = arr2d.shape
    # Scale to fit IMG_SIZE while preserving aspect ratio
    scale = IMG_SIZE / max(h, w)
    new_h, new_w = int(h * scale), int(w * scale)

    grey = Image.fromarray(arr2d, mode="L").resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", (IMG_SIZE, IMG_SIZE), BG_COLOR)
    # Centre on canvas
    ox = (IMG_SIZE - new_w) // 2
    oy = (IMG_SIZE - new_h) // 2
    canvas.paste(grey.convert("RGB"), (ox, oy))

    draw = ImageDraw.Draw(canvas)

    # Overlay text bottom-right
    text = f"MNI 2mm · 91×109×91"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", 9)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((IMG_SIZE - tw - 6, IMG_SIZE - th - 6), text, fill=(120, 140, 160), font=font)

    # Plane label top-left
    label = f"{plane_label.upper()}  {idx+1}/{total}"
    draw.text((6, 6), label, fill=(100, 130, 160), font=font)

    return canvas

# ── Axial slices (z-axis, dim=2): 8 slices ──────────────────────────────────
axial_z = np.linspace(20, 75, 8, dtype=int)
for i, z in enumerate(axial_z):
    sl = vol[:, :, z]          # shape (91, 109)
    img = make_png(sl, "axial", i, 8)
    img.save(OUT_DIR / f"axial_{i}.png")
    print(f"  axial_{i}.png  z={z}")

# ── Coronal slices (y-axis, dim=1): 4 slices ────────────────────────────────
coronal_y = np.linspace(30, 80, 4, dtype=int)
for i, y in enumerate(coronal_y):
    sl = vol[:, y, :]          # shape (91, 91)
    img = make_png(sl, "coronal", i, 4)
    img.save(OUT_DIR / f"coronal_{i}.png")
    print(f"  coronal_{i}.png  y={y}")

# ── Sagittal slices (x-axis, dim=0): 4 slices ───────────────────────────────
sagittal_x = np.linspace(25, 65, 4, dtype=int)
for i, x in enumerate(sagittal_x):
    sl = vol[x, :, :]          # shape (109, 91)
    img = make_png(sl, "sagittal", i, 4)
    img.save(OUT_DIR / f"sagittal_{i}.png")
    print(f"  sagittal_{i}.png  x={x}")

print(f"\nDone — {len(list(OUT_DIR.glob('*.png')))} PNGs in {OUT_DIR}")
