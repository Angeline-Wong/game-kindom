from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


root = Path(r"D:\dev\codex\games-kingdom\docs\妃子图库")
items = [
    (root / "古风游戏角色立绘生成 (18).png", 210),
    (root / "古风游戏角色立绘生成 (28).png", 170),
]

for source, floor in items:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image)
    height, width = rgb.shape[:2]
    allowed = bytearray(((rgb.min(axis=2) >= floor) & ((rgb.max(axis=2) - rgb.min(axis=2)) <= 12)).reshape(-1))
    background = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(1, height - 1):
        queue.extend((y * width, y * width + width - 1))
    while queue:
        index = queue.popleft()
        if background[index] or not allowed[index]:
            continue
        background[index] = 1
        x = index % width
        if x:
            queue.append(index - 1)
        if x + 1 < width:
            queue.append(index + 1)
        if index >= width:
            queue.append(index - width)
        if index + width < width * height:
            queue.append(index + width)

    foreground = bytearray(1 if value == 0 else 0 for value in background)
    subject = bytearray(width * height)
    queue = deque([height // 2 * width + width // 2])
    while queue:
        index = queue.popleft()
        if subject[index] or not foreground[index]:
            continue
        subject[index] = 1
        x = index % width
        if x:
            queue.append(index - 1)
        if x + 1 < width:
            queue.append(index + 1)
        if index >= width:
            queue.append(index - width)
        if index + width < width * height:
            queue.append(index + width)

    alpha = np.frombuffer(subject, dtype=np.uint8).reshape(height, width) * 255
    alpha_image = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(0.55))
    result = image.convert("RGBA")
    result.putalpha(alpha_image)
    output = root / "抠图结果-新版" / f"{source.stem}_人物.png"
    result.save(output, optimize=True)
    print(output)
