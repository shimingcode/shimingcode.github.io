"""Create additional derivatives directly from originals; never replace source images."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
IMAGES=ROOT/'assets/images'

def save(source,target,width,fmt,quality,square=False):
    with Image.open(source) as original:
        image=ImageOps.exif_transpose(original).convert('RGB')
        if square: image=ImageOps.fit(image,(width,width),Image.Resampling.LANCZOS)
        elif image.width>width: image=image.resize((width,round(image.height*width/image.width)),Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True,exist_ok=True)
        image.save(target,fmt,quality=quality,**({'speed':6} if fmt=='AVIF' else {'method':6}))
        print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes, {image.size}')

if __name__=='__main__':
    for name,source in [('background','background.jpg.jpg'),('works-background','works-background.jpg')]:
        save(IMAGES/source,IMAGES/f'{name}.avif',1600,'AVIF',60)
        save(IMAGES/source,IMAGES/f'{name}-mobile.avif',768,'AVIF',60)
        # Decorative backgrounds retain full dimensions; preserve earlier derivatives
        # and the JPEG/WebP fallbacks for review and rollback.
        save(IMAGES/source,IMAGES/f'{name}-optimized.avif',1600,'AVIF',48)
        save(IMAGES/source,IMAGES/f'{name}-mobile-optimized.avif',768,'AVIF',48)
    save(IMAGES/'avatar.png.jpg',IMAGES/'avatar-160.webp',160,'WEBP',86,True)
    for source in sorted((IMAGES/'works').glob('photo-*.jpg')):
        for width in [320,768]: save(source,source.parent/'thumbs'/f'{source.stem}-{width}.webp',width,'WEBP',84)
        save(source,source.parent/'display'/f'{source.stem}.webp',1600,'WEBP',82)
