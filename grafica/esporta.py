"""Copia i PNG generati da render.mjs nelle cartelle dell'app, nelle misure giuste."""
import sys
from PIL import Image
D = sys.argv[1]
ap = lambda n: Image.open(f'{D}/{n}.png').convert('RGBA')
def rgb(im):
    f = Image.new('RGB', im.size, '#E5202A'); f.paste(im, mask=im.split()[3]); return f
icona, mask, fg, spl = ap('icona'), ap('maskable'), ap('android-fg'), ap('splash')
rgb(icona).save('assets/icon.png', optimize=True)
for size, path in [(192, 'public/icon-192.png'), (512, 'public/icon-512.png'), (180, 'public/apple-touch-icon.png'), (96, 'assets/favicon.png')]:
    rgb(icona).resize((size, size), Image.LANCZOS).save(path, optimize=True)
rgb(mask).resize((512, 512), Image.LANCZOS).save('public/icon-maskable-512.png', optimize=True)
fg.save('assets/android-icon-foreground.png', optimize=True)
fg.save('assets/android-icon-monochrome.png', optimize=True)   # sagoma già a un colore
Image.new('RGBA', (512, 512), '#E5202A').save('assets/android-icon-background.png')
spl.save('assets/splash-icon.png', optimize=True)
spl.resize((512, 512), Image.LANCZOS).save('public/logo.png', optimize=True)
print('ok')
