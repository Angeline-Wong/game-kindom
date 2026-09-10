"""Heuristic alpha matte for portrait renders with dark studio backdrops.

The image generator occasionally ignores a requested chroma key and emits a
radial black/gray backdrop. This conservative matte keeps colorful/bright
figure pixels and grows that confidence mask only a short distance into dark
cloth and hair, leaving the surrounding backdrop transparent.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    img = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    img = img.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    return np.asarray(img) > 0


def erode(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    img = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    img = img.filter(ImageFilter.MinFilter(radius * 2 + 1))
    return np.asarray(img) > 0


def matte(src: Path, out: Path) -> tuple[int, int, int, int]:
    image = Image.open(src).convert("RGB")
    rgb = np.asarray(image).astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = mx - mn
    lum = rgb.mean(axis=2)

    # The outer border is the generated studio backdrop; adapt slightly to
    # different exposure levels while keeping a firm floor for the figure.
    border = np.concatenate((lum[0], lum[-1], lum[:, 0], lum[:, -1]))
    border_lum = float(np.median(border))
    bright_threshold = max(72.0, border_lum + 58.0)
    high = (sat >= 18) | (lum >= bright_threshold)
    high = erode(dilate(high, 3), 1)

    # Grow into dark hair, hats, shoes, and shadowed folds only near a
    # confident figure pixel. This avoids retaining the broad gray halo.
    mid = ((sat >= 8) | (lum >= 50)) & dilate(high, 15)
    dark = ((sat >= 4) | (lum >= 24)) & dilate(high, 7)
    keep = high | mid | dark

    # Remove isolated speckles and soften only the silhouette edge.
    keep = erode(dilate(keep, 2), 1)
    alpha = np.zeros(keep.shape, dtype=np.uint8)
    alpha[dark] = 140
    alpha[mid] = 205
    alpha[high] = 255
    alpha[~keep] = 0
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(radius=1.1))
    alpha = np.asarray(alpha_img).copy()
    # Fully transparent pixels are also blackened to prevent fringe color in
    # engines that premultiply or sample RGB outside the alpha matte.
    out_rgba = np.dstack((np.asarray(image), alpha))
    out_rgba[alpha == 0, :3] = 0
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out_rgba, "RGBA").save(out, "PNG", optimize=True)
    ys, xs = np.where(alpha > 0)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else (0, 0, 0, 0)
    return int(alpha.min()), int(alpha.max()), int((alpha == 0).sum()), bbox[2] - bbox[0] + 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    result = matte(Path(args.input), Path(args.output))
    print("alpha_min alpha_max transparent_pixels bbox_width:", *result)


if __name__ == "__main__":
    main()
