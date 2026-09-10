"""Convert 生成UI 皇帝立绘 (1024x1536 transparent PNG) to 416x624 transparent PNG
and place them in src/assets/emperor-portraits/emperor-01.png .. emperor-06.png.
This keeps consistency with consort/minister portraits (also 416x624).
"""
from pathlib import Path

from PIL import Image

ROOT = Path(r"D:/dev/codex/games-kingdom")
SRC_DIR = ROOT / "docs/生成UI/皇帝立绘"
DST_DIR = ROOT / "src/assets/emperor-portraits"
DST_DIR.mkdir(parents=True, exist_ok=True)
TARGET_SIZE = (416, 624)

source_files = sorted(SRC_DIR.glob("皇帝_*.png"))
assert source_files, f"no source files under {SRC_DIR}"

for index, src in enumerate(source_files, start=1):
    with Image.open(src) as img:
        img.load()
        rgba = img.convert("RGBA")
        resized = rgba.resize(TARGET_SIZE, Image.LANCZOS)
        dst = DST_DIR / f"emperor-{index:02d}.png"
        resized.save(dst, "PNG", optimize=True)
        print(f"saved {dst} <- {src.name} {rgba.size} -> {resized.size} {dst.stat().st_size//1024}KB")