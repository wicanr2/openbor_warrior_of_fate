#!/usr/bin/env python3
"""Build labelled first-frame contact sheets from the exported GIF inventory."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('research/sprites')
OUTPUT = Path('research/contact-sheets')
CHARACTERS = ('guanyu', 'zhaoyun', 'zhangfei', 'weiyan', 'huangzhong')
COLS, CELL_W, CELL_H, TITLE_H = 6, 160, 156, 56
BACKGROUND, CELL, TEXT = '#111827', '#1f2937', '#f9fafb'

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    TITLE_FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
except OSError:
    FONT = TITLE_FONT = ImageFont.load_default()

def label_for(image_path: Path, character: str) -> str:
    label = image_path.relative_to(ROOT / character).as_posix()
    return label if len(label) <= 22 else f'{label[:19]}...'

OUTPUT.mkdir(parents=True, exist_ok=True)
for character in CHARACTERS:
    images = sorted((ROOT / character).rglob('*'), key=lambda item: item.as_posix().lower())
    images = [item for item in images if item.is_file() and item.suffix.lower() == '.gif']
    rows = (len(images) + COLS - 1) // COLS
    canvas = Image.new('RGBA', (COLS * CELL_W, TITLE_H + rows * CELL_H), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    title = f'{character} — {len(images)} GIF frames'
    draw.text((18, 14), title, font=TITLE_FONT, fill=TEXT)
    for index, image_path in enumerate(images):
        x, y = (index % COLS) * CELL_W, TITLE_H + (index // COLS) * CELL_H
        draw.rectangle((x + 3, y + 3, x + CELL_W - 3, y + CELL_H - 3), fill=CELL)
        with Image.open(image_path) as frame:
            frame.seek(0)
            sprite = frame.convert('RGBA')
        # This OpenBOR module uses magenta as a palette-key transparency color.
        pixels = sprite.load()
        for pixel_y in range(sprite.height):
            for pixel_x in range(sprite.width):
                red, green, blue, alpha = pixels[pixel_x, pixel_y]
                if red > 240 and green < 30 and blue > 200:
                    pixels[pixel_x, pixel_y] = (red, green, blue, 0)
        sprite.thumbnail((CELL_W - 16, CELL_H - 38), Image.Resampling.LANCZOS)
        sprite_x = x + (CELL_W - sprite.width) // 2
        sprite_y = y + 8 + (CELL_H - 38 - sprite.height) // 2
        canvas.alpha_composite(sprite, (sprite_x, sprite_y))
        draw.text((x + 7, y + CELL_H - 24), label_for(image_path, character), font=FONT, fill=TEXT)
    canvas.convert('RGB').save(OUTPUT / f'{character}.png', optimize=True)
