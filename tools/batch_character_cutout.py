from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


SOURCE_DIR = Path(r"D:\dev\codex\games-kingdom\docs\妃子图库")
OUTPUT_DIR = SOURCE_DIR / "抠图结果-新版"


def connected_region(mask: np.ndarray, seeds: list[int], width: int, height: int) -> bytearray:
    allowed = bytearray(mask.reshape(-1))
    selected = bytearray(width * height)
    queue = deque(seeds)
    while queue:
        index = queue.popleft()
        if selected[index] or not allowed[index]:
            continue
        selected[index] = 1
        x = index % width
        if x:
            queue.append(index - 1)
        if x + 1 < width:
            queue.append(index + 1)
        if index >= width:
            queue.append(index - width)
        if index + width < width * height:
            queue.append(index + width)
    return selected


def cut_out(source: Path, output: Path) -> None:
    rgb_image = Image.open(source).convert("RGB")
    rgb = np.asarray(rgb_image)
    height, width = rgb.shape[:2]

    bright = rgb.min(axis=2) >= 228
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) <= 12
    background_candidate = bright & neutral

    edge_seeds = []
    for x in range(width):
        edge_seeds.extend((x, (height - 1) * width + x))
    for y in range(1, height - 1):
        edge_seeds.extend((y * width, y * width + width - 1))

    background = connected_region(background_candidate, edge_seeds, width, height)
    foreground_candidate = np.frombuffer(background, dtype=np.uint8).reshape(height, width) == 0

    # Generated character portraits are centered. Keeping the component that
    # intersects a small center box removes detached watermarks and particles.
    center_seeds = []
    for y in range(height * 45 // 100, height * 56 // 100, 8):
        for x in range(width * 45 // 100, width * 56 // 100, 8):
            center_seeds.append(y * width + x)
    subject = connected_region(foreground_candidate, center_seeds, width, height)

    alpha_array = np.frombuffer(subject, dtype=np.uint8).reshape(height, width) * 255
    alpha = Image.fromarray(alpha_array, mode="L").filter(ImageFilter.GaussianBlur(0.55))

    result = rgb_image.convert("RGBA")
    result.putalpha(alpha)
    result.save(output, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(SOURCE_DIR.glob("*.png"))
    for index, source in enumerate(sources, 1):
        output = OUTPUT_DIR / f"{source.stem}_人物.png"
        cut_out(source, output)
        print(f"[{index:02d}/{len(sources):02d}] {output.name}", flush=True)


if __name__ == "__main__":
    main()
