"""
Generate synthetic feature map PNGs + animated GIF for the SFCNExplainer
interactive forward-pass component.

Outputs to: public/assets/features/
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import nibabel as nib
from PIL import Image, ImageFilter

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = Path("/Users/ninad/Documents/IISc/brainage-fingerprints.github.io")
SLICES_DIR = ROOT / "public" / "assets" / "slices"
OUT_DIR = ROOT / "public" / "assets" / "features"
NIFTI = Path("/Users/ninad/Documents/IISc/VAL/Documents/preprocessing-FSL-ninad/ninad_normalised.nii.gz")

OUT_DIR.mkdir(parents=True, exist_ok=True)

CANVAS = 320
BG = (10, 15, 26)  # #0a0f1a

# ── Helpers ──────────────────────────────────────────────────────────────────


def to_uint8(a: np.ndarray) -> np.ndarray:
    a = a.astype(np.float32)
    lo, hi = np.percentile(a[a > 0], (1, 99)) if (a > 0).any() else (a.min(), a.max())
    if hi <= lo:
        hi = lo + 1
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    return (a * 255).astype(np.uint8)


def load_mid_axial() -> np.ndarray:
    """Return the mid axial slice of the normalised brain as a 2D uint8 array."""
    if NIFTI.exists():
        img = nib.load(str(NIFTI))
        vol = img.get_fdata()
        z = vol.shape[2] // 2
        sl = vol[:, :, z]
        sl = np.rot90(sl)
        return to_uint8(sl)
    # Fallback: use the existing PNG axial_4
    im = Image.open(SLICES_DIR / "axial_4.png").convert("L")
    return np.array(im)


def place_on_canvas(img: Image.Image, size: int = CANVAS) -> Image.Image:
    """Resize-to-fit onto a square dark canvas, preserving aspect."""
    bg = Image.new("RGB", (size, size), BG)
    w, h = img.size
    scale = min(size / w, size / h)
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img.resize((new_w, new_h), Image.NEAREST)
    if resized.mode != "RGB":
        resized = resized.convert("RGB")
    bg.paste(resized, ((size - new_w) // 2, (size - new_h) // 2))
    return bg


def pixelate(arr2d: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """Downsample (bilinear) then NEAREST-upscale back to original H×W. arr2d is uint8."""
    src_h, src_w = arr2d.shape
    im = Image.fromarray(arr2d, mode="L")
    small = im.resize((target_w, target_h), Image.BILINEAR)
    big = small.resize((src_w, src_h), Image.NEAREST)
    return np.array(big)


def tint(gray: np.ndarray, color: tuple[int, int, int]) -> np.ndarray:
    """Multiply a uint8 grayscale by a target color (per-channel)."""
    g = gray.astype(np.float32) / 255.0
    out = np.stack([g * color[0], g * color[1], g * color[2]], axis=-1)
    return np.clip(out, 0, 255).astype(np.uint8)


def sobel_edges(gray: np.ndarray) -> np.ndarray:
    """Simple Sobel magnitude."""
    im = Image.fromarray(gray, mode="L").filter(ImageFilter.FIND_EDGES)
    return np.array(im)


# ── Per-layer generators ─────────────────────────────────────────────────────


def gen_input(brain: np.ndarray) -> Image.Image:
    """Grayscale, no processing — represents raw input."""
    return place_on_canvas(Image.fromarray(brain, mode="L"))


def gen_conv1(brain: np.ndarray) -> Image.Image:
    """45×54 pixelation + amber tint + edge overlay."""
    pix = pixelate(brain, 45, 54)
    edges = sobel_edges(pix)
    amber = tint(pix, (255, 168, 60))
    # add edge highlights on top
    e3 = np.stack([edges, edges * 0.7, edges * 0.3], axis=-1).astype(np.uint8)
    combined = np.clip(amber.astype(np.int32) + (e3.astype(np.int32) * 0.55).astype(np.int32), 0, 255).astype(np.uint8)
    return place_on_canvas(Image.fromarray(combined, mode="RGB"))


def gen_conv2(brain: np.ndarray) -> Image.Image:
    """22×27 pixelation + amber/teal hemisphere split."""
    pix = pixelate(brain, 22, 27)
    h, w = pix.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    left = tint(pix, (255, 168, 60))   # amber
    right = tint(pix, (60, 200, 190))  # teal
    mid = w // 2
    out[:, :mid] = left[:, :mid]
    out[:, mid:] = right[:, mid:]
    return place_on_canvas(Image.fromarray(out, mode="RGB"))


def gen_conv3(brain: np.ndarray) -> Image.Image:
    """11×13 pixelation + 3-color intensity threshold (orange/teal/purple)."""
    pix = pixelate(brain, 11, 13)
    h, w = pix.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    low = pix < 70
    mid = (pix >= 70) & (pix < 150)
    hi = pix >= 150
    # tinted, intensity-weighted
    g = pix.astype(np.float32) / 255.0
    out[low] = np.stack([g[low] * 90, g[low] * 60, g[low] * 200], axis=-1)         # purple
    out[mid] = np.stack([g[mid] * 60, g[mid] * 200, g[mid] * 190], axis=-1)        # teal
    out[hi] = np.stack([g[hi] * 255, g[hi] * 140, g[hi] * 50], axis=-1)            # orange
    out = np.clip(out, 0, 255).astype(np.uint8)
    return place_on_canvas(Image.fromarray(out, mode="RGB"))


def gen_conv4(brain: np.ndarray) -> Image.Image:
    """5×6 — bright multicolour."""
    pix = pixelate(brain, 5, 6)
    h, w = pix.shape
    rng = np.random.default_rng(4)
    # base palette per block
    palette = np.array([
        [255, 90, 90], [255, 170, 60], [60, 200, 200],
        [180, 90, 255], [90, 220, 130], [255, 220, 90],
    ], dtype=np.float32)
    idx = rng.integers(0, len(palette), size=(h, w))
    g = pix.astype(np.float32) / 255.0
    base = palette[idx]
    out = (base * (0.4 + 0.6 * g[..., None])).clip(0, 255).astype(np.uint8)
    return place_on_canvas(Image.fromarray(out, mode="RGB"))


def gen_conv5(brain: np.ndarray) -> Image.Image:
    """2×3 — vivid purple/pink, very blocky."""
    pix = pixelate(brain, 2, 3)
    h, w = pix.shape
    rng = np.random.default_rng(5)
    palette = np.array([[170, 60, 230], [240, 80, 200], [120, 40, 200], [230, 100, 230]], dtype=np.float32)
    idx = rng.integers(0, len(palette), size=(h, w))
    g = pix.astype(np.float32) / 255.0
    base = palette[idx]
    out = (base * (0.5 + 0.5 * g[..., None])).clip(0, 255).astype(np.uint8)
    return place_on_canvas(Image.fromarray(out, mode="RGB"))


def gen_conv6(brain: np.ndarray) -> Image.Image:
    """2×3 — teal/blue (k=1 channel-mix)."""
    pix = pixelate(brain, 2, 3)
    h, w = pix.shape
    rng = np.random.default_rng(6)
    palette = np.array([[40, 180, 220], [80, 130, 240], [40, 220, 200], [60, 100, 220]], dtype=np.float32)
    idx = rng.integers(0, len(palette), size=(h, w))
    g = pix.astype(np.float32) / 255.0
    base = palette[idx]
    out = (base * (0.5 + 0.5 * g[..., None])).clip(0, 255).astype(np.uint8)
    return place_on_canvas(Image.fromarray(out, mode="RGB"))


def gen_pool() -> Image.Image:
    """8×8 grid (64 squares) on dark bg with hues spread across spectrum."""
    rng = np.random.default_rng(8)
    size = CANVAS
    img = Image.new("RGB", (size, size), BG)
    pix = img.load()
    grid = 8
    cell = (size - 32) // grid  # leaves a margin
    margin = (size - cell * grid) // 2
    # Spectrum hues, slight noise
    import colorsys
    for i in range(grid):
        for j in range(grid):
            idx = i * grid + j
            h = (idx / 64.0) + rng.uniform(-0.015, 0.015)
            h = h % 1.0
            s = 0.65 + rng.uniform(-0.1, 0.1)
            v = 0.55 + rng.uniform(-0.15, 0.25)
            r, g, b = colorsys.hsv_to_rgb(h, s, v)
            color = (int(r * 255), int(g * 255), int(b * 255))
            x0 = margin + j * cell
            y0 = margin + i * cell
            for y in range(y0 + 1, y0 + cell - 1):
                for x in range(x0 + 1, x0 + cell - 1):
                    pix[x, y] = color
    return img


# ── Animated GIF ─────────────────────────────────────────────────────────────


def make_brain_gif() -> None:
    frames = []
    for i in range(8):
        im = Image.open(SLICES_DIR / f"axial_{i}.png").convert("RGB")
        # ensure square dark bg
        canvas = Image.new("RGB", (im.width, im.height), BG)
        canvas.paste(im, (0, 0))
        frames.append(canvas)
    out = OUT_DIR / "brain_anim.gif"
    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=150,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"  wrote {out.name}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    print("Loading brain volume...")
    brain = load_mid_axial()
    print(f"  mid axial shape: {brain.shape}")

    print("Generating GIF...")
    make_brain_gif()

    print("Generating feature maps...")
    generators = {
        "feat_input.png":  gen_input(brain),
        "feat_conv1.png":  gen_conv1(brain),
        "feat_conv2.png":  gen_conv2(brain),
        "feat_conv3.png":  gen_conv3(brain),
        "feat_conv4.png":  gen_conv4(brain),
        "feat_conv5.png":  gen_conv5(brain),
        "feat_conv6.png":  gen_conv6(brain),
        "feat_pool.png":   gen_pool(),
    }
    for name, im in generators.items():
        path = OUT_DIR / name
        im.save(path, "PNG")
        print(f"  wrote {name}")
    print(f"Done. → {OUT_DIR}")


if __name__ == "__main__":
    main()
