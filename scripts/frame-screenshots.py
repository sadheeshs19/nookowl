"""
Frames app screenshots for the App Store and Google Play.

Put raw screenshots in a folder named 1.png ... 6.png (phone) and, optionally,
tablet/1.png ... tablet/6.png. Then:

    python scripts/frame-screenshots.py <input-folder> <output-folder>

Makes, for each screenshot: a night-sky background with stars, a big caption,
and the screenshot in a rounded "device" frame, in every size the stores need:
  apple-iphone-6.9   1320 x 2868   (App Store, required)
  apple-ipad-13      2064 x 2752   (App Store, required if the app runs on iPad)
  play-phone         1080 x 1920
  play-tablet-7      1200 x 1920
  play-tablet-10     1600 x 2560
"""
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_TITLE = ROOT / 'node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'
FONT_SUB = ROOT / 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'

CAPTIONS = {
    1: ('Talk about the things you love', 'Post a topic, pick a colour and a mood'),
    2: ('Choose who you talk to', 'Send a call request, or start a chat'),
    3: ('Real people, real profiles', 'Photos, languages and interests. Never your email'),
    4: ('Stay in touch', 'Chats, voice notes and friendly hoots'),
    5: ('Free to talk?', 'A little hoot says hello'),
    6: ('Real voices, real conversations', '15 free minutes every day'),
}

SIZES = {
    'apple-iphone-6.9': ((1320, 2868), 'phone'),
    'apple-ipad-13': ((2064, 2752), 'tablet'),
    'play-phone': ((1080, 1920), 'phone'),
    'play-tablet-7': ((1200, 1920), 'tablet'),
    'play-tablet-10': ((1600, 2560), 'tablet'),
}

TOP = (10, 14, 31)
MID = (17, 23, 53)
BOTTOM = (43, 31, 82)
ACCENT = (253, 186, 140)


def background(w, h, seed):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        a, b, k = (TOP, MID, t / 0.55) if t < 0.55 else (MID, BOTTOM, (t - 0.55) / 0.45)
        row = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
        for x in range(w):
            px[x, y] = row
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    for _ in range(int(w * h / 9000)):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h * 0.9)
        r = rnd.uniform(0.6, 2.2) * w / 1200
        c = int(rnd.uniform(140, 255))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(c, c, c))
    # soft orange glow near the bottom
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((w * 0.1, h * 0.7, w * 0.9, h * 1.25), fill=(120, 45, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(w / 8))
    return Image.blend(img, Image.composite(glow, img, glow.convert('L')), 0.45)


def wrap(draw, text, font, max_w):
    words, lines, line = text.split(), [], ''
    for word in words:
        test = (line + ' ' + word).strip()
        if draw.textlength(test, font=font) <= max_w:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def rounded(im, radius):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.size[0], im.size[1]), radius=radius, fill=255)
    out = Image.new('RGBA', im.size)
    out.paste(im, (0, 0), mask)
    return out


def frame(shot_path, n, size, kind):
    w, h = size
    canvas = background(w, h, n).convert('RGBA')
    d = ImageDraw.Draw(canvas)
    title, sub = CAPTIONS[n]
    pad = int(w * 0.08)
    tsize = int(w * (0.085 if kind == 'phone' else 0.062))
    ft = ImageFont.truetype(str(FONT_TITLE), tsize)
    fs = ImageFont.truetype(str(FONT_SUB), int(tsize * 0.42))
    y = int(h * 0.055)
    for line in wrap(d, title, ft, w - 2 * pad):
        lw = d.textlength(line, font=ft)
        d.text(((w - lw) / 2, y), line, font=ft, fill=(255, 255, 255))
        y += int(tsize * 1.08)
    y += int(tsize * 0.25)
    for line in wrap(d, sub, fs, w - 2 * pad):
        lw = d.textlength(line, font=fs)
        d.text(((w - lw) / 2, y), line, font=fs, fill=ACCENT)
        y += int(tsize * 0.55)
    top = y + int(h * 0.035)

    shot = Image.open(shot_path).convert('RGB')
    max_w, max_h = w - 2 * pad, h - top + int(h * 0.06)  # let the device run off the bottom a little
    scale = min(max_w / shot.width, max_h / shot.height)
    sw, sh = int(shot.width * scale), int(shot.height * scale)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    bezel = int(sw * 0.025)
    radius = int(sw * (0.11 if kind == 'phone' else 0.05))
    device = Image.new('RGB', (sw + 2 * bezel, sh + 2 * bezel), (18, 18, 22))
    device = rounded(device, radius + bezel)
    device.alpha_composite(rounded(shot, radius), (bezel, bezel))
    shadow = Image.new('RGBA', (device.width + 200, device.height + 200), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((100, 120, 100 + device.width, 120 + device.height), radius=radius, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    x = (w - device.width) // 2
    canvas.alpha_composite(shadow, (x - 100, top - 100))
    canvas.alpha_composite(device, (x, top))
    return canvas.convert('RGB')


def main(src, dst):
    src, dst = Path(src), Path(dst)
    made = 0
    for name, (size, kind) in SIZES.items():
        folder = src / 'tablet' if kind == 'tablet' and (src / 'tablet').exists() else src
        for n in CAPTIONS:
            shot = next((folder / f'{n}{ext}' for ext in ('.png', '.jpg', '.jpeg') if (folder / f'{n}{ext}').exists()), None)
            if not shot:
                continue
            out = dst / name
            out.mkdir(parents=True, exist_ok=True)
            frame(shot, n, size, kind).save(out / f'{n}.png', optimize=True)
            made += 1
    print(f'made {made} images in {dst}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
