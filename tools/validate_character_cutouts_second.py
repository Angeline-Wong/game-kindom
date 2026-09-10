from pathlib import Path

import numpy as np
from PIL import Image


directory = Path(r"D:\dev\codex\games-kingdom\docs\妃子图库\抠图结果-第二批")
files = sorted(directory.glob("*.png"))
bad = []
ratios = []
for path in files:
    with Image.open(path) as image:
        alpha = np.asarray(image.getchannel("A"))
        ratio = float((alpha > 0).mean())
        ratios.append(ratio)
        corners = [alpha[0, 0], alpha[0, -1], alpha[-1, 0], alpha[-1, -1]]
        if any(corners) or ratio < 0.05 or ratio > 0.85:
            bad.append((path.name, ratio, [int(value) for value in corners]))

print(f"files={len(files)}")
print(f"coverage={min(ratios):.4f}..{max(ratios):.4f}")
print(f"bad={bad}")
