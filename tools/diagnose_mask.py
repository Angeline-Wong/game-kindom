from PIL import Image
import numpy as np
import sys

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
mx, mn = im.max(2), im.min(2)
sat, lum = mx - mn, im.mean(2)
m = (sat > 12) | (lum > 70)
for _ in range(3):
    p = np.pad(m, 1)
    m = np.maximum.reduce([
        p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:],
        p[1:-1, :-2], p[1:-1, 1:-1], p[1:-1, 2:],
        p[2:, :-2], p[2:, 1:-1], p[2:, 2:],
    ])
for _ in range(6):
    p = np.pad(m, 1)
    m = np.minimum.reduce([
        p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:],
        p[1:-1, :-2], p[1:-1, 1:-1], p[1:-1, 2:],
        p[2:, :-2], p[2:, 1:-1], p[2:, 2:],
    ])
Image.fromarray((m * 255).astype("uint8")).save(out)
print("area", float(m.mean()))
