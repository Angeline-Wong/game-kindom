from pathlib import Path

import numpy as np
from PIL import Image


directory = Path(r"D:\dev\codex\games-kingdom\docs\妃子图库\抠图结果-新版")
files = sorted(directory.glob("*.png"))
coverage = []
bad_corners = []

for path in files:
    with Image.open(path) as image:
        alpha = np.asarray(image.getchannel("A"))
        coverage.append((path.name, float((alpha > 0).mean())))
        corners = [
            int(alpha[0, 0]),
            int(alpha[0, -1]),
            int(alpha[-1, 0]),
            int(alpha[-1, -1]),
        ]
        if any(corners):
            bad_corners.append((path.name, corners))

bad_coverage = [(name, ratio) for name, ratio in coverage if ratio < 0.05 or ratio > 0.85]
print(f"files={len(files)}")
print(f"coverage_min={min(ratio for _, ratio in coverage):.4f}")
print(f"coverage_max={max(ratio for _, ratio in coverage):.4f}")
print(f"bad_coverage={bad_coverage}")
print(f"nontransparent_corners={bad_corners}")
