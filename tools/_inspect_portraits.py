from PIL import Image
import os

base = 'src/assets'
for d in ['emperor-portraits', 'consort-portraits', 'minister-portraits']:
    f = os.path.join(base, d)
    files = sorted(os.listdir(f))
    p = os.path.join(f, files[0])
    img = Image.open(p)
    print(p, img.size, img.mode)

print('--- heir 1-3 ---')
heir_dir = os.path.join(base, 'heir-portraits', '1-3')
for f in sorted(os.listdir(heir_dir)):
    p = os.path.join(heir_dir, f)
    img = Image.open(p)
    print(p, img.size, img.mode)
