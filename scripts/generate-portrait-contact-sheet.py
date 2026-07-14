#!/usr/bin/env python3
"""Create a labelled overview of OpenBOR icon and HUD-profile assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('research/portraits')
OUTPUT = Path('research/contact-sheets/portrait-assets.png')
COLS, CELL_W, CELL_H, TITLE_H = 5, 192, 178, 58

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    TITLE_FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 25)
except OSError:
    FONT = TITLE_FONT = ImageFont.load_default()

images = sorted((file for file in ROOT.rglob('*') if file.is_file() and file.suffix.lower() == '.gif'), key=lambda item: item.as_posix().lower())
rows = (len(images) + COLS - 1) // COLS
canvas = Image.new('RGBA', (COLS * CELL_W, TITLE_H + rows * CELL_H), '#111827')
draw = ImageDraw.Draw(canvas)
draw.text((16, 14), f'Portrait and UI icon assets — {len(images)} GIF files', font=TITLE_FONT, fill='#f9fafb')
for index, image_path in enumerate(images):
    x, y = (index % COLS) * CELL_W, TITLE_H + (index // COLS) * CELL_H
    draw.rectangle((x + 3, y + 3, x + CELL_W - 3, y + CELL_H - 3), fill='#1f2937')
    with Image.open(image_path) as frame:
        frame.seek(0)
        sprite = frame.convert('RGBA')
    pixels = sprite.load()
    for py in range(sprite.height):
        for px in range(sprite.width):
            red, green, blue, alpha = pixels[px, py]
            if red > 240 and green < 30 and blue > 200:
                pixels[px, py] = (red, green, blue, 0)
    sprite.thumbnail((CELL_W - 16, CELL_H - 42), Image.Resampling.LANCZOS)
    canvas.alpha_composite(sprite, (x + (CELL_W - sprite.width) // 2, y + 6 + (CELL_H - 42 - sprite.height) // 2))
    label = image_path.relative_to(ROOT).as_posix().replace('data/', '')
    label = label if len(label) <= 27 else f'{label[:24]}...'
    draw.text((x + 7, y + CELL_H - 25), label, font=FONT, fill='#f9fafb')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.convert('RGB').save(OUTPUT, optimize=True)
