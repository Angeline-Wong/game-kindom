from PIL import Image
import os

# Check original source portrait sizes
sources = [
    'docs/生成UI/皇帝立绘/皇帝_01.png',
    'docs/生成UI/妃子立绘/旧版/古风游戏角色立绘生成 (1)_人物.png',
    'docs/生成UI/臣子立绘/臣子_01.png',
    'docs/生成UI/皇子立绘/1-3/皇子_01_1-3岁.png',
    'docs/生成UI/皇子立绘/1-3/公主_01_1-3岁.png',
]
for p in sources:
    if os.path.exists(p):
        img = Image.open(p)
        print(p, img.size, img.mode)
    else:
        print('MISSING', p)
