"""Generate web assets without overwriting originals. Run: py scripts/optimize-images.py"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / 'assets/images'

def webp(source, target, width=None, square=False, quality=80):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        if square:
            image = ImageOps.fit(image, (336, 336), Image.Resampling.LANCZOS)
        elif width and image.width > width:
            image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, 'WEBP', quality=quality, method=6)
        print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes, {image.width}x{image.height}')

for name, source in [('background', 'background.jpg.jpg'), ('works-background', 'works-background.jpg')]:
    webp(IMAGES / source, IMAGES / f'{name}.webp')
    webp(IMAGES / source, IMAGES / f'{name}-mobile.webp', width=768)
webp(IMAGES / 'avatar.png.jpg', IMAGES / 'avatar.webp', square=True, quality=84)
with Image.open(IMAGES / 'avatar.png.jpg') as image:
    ImageOps.fit(ImageOps.exif_transpose(image).convert('RGB'), (336, 336), Image.Resampling.LANCZOS).save(IMAGES / 'avatar-small.jpg', quality=88, optimize=True)
for photo in sorted((IMAGES / 'works').iterdir()):
    if photo.is_file() and photo.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.avif'}:
        webp(photo, IMAGES / 'works/thumbs' / (photo.stem + '.webp'), width=480, quality=80)

