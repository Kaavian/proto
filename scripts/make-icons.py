#!/usr/bin/env python3
"""Regenerate Proto's PWA icons into ../public/.

Brand mark: saffron gradient + white speech bubble + a bold, rounded Tamil "அ"
(InaiMathi Bold) in saffron, with a small accent dot echoing the "Proto." wordmark.

macOS-specific (uses the system InaiMathi font). Requires Pillow:
    python3 -m pip install Pillow
    python3 scripts/make-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "/System/Library/Fonts/Supplemental/InaiMathi-MN.ttc"
FONT_INDEX = 1            # bold face
GLYPH = "அ"          # அ — Tamil letter A (first letter of the alphabet)
MASTER = 1024             # render big, downsample for crisp edges

TOP = (251, 141, 62)      # gradient top (lighter saffron)
BOTTOM = (227, 88, 8)     # gradient bottom (deeper saffron)
BUBBLE = (255, 255, 255)
INK = (232, 90, 12)       # saffron glyph + accent dot

BUB = dict(l=0.224, t=0.246, r=0.776, b=0.688, rad=0.108)
TAIL = [(0.300, 0.655), (0.291, 0.792), (0.452, 0.676)]  # down-left speech tail
GLYPH_H_FRAC = 0.335
STROKE_FRAC = 0.008       # extra embolden on top of the bold face
DOT_R_FRAC = 0.032
DOT_GAP_FRAC = 0.030
GLYPH_SHIFT = 0.024       # nudge left to leave room for the dot

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public")


def vgrad(d, size):
    for y in range(size):
        f = y / (size - 1)
        d.line([(0, y), (size, y)],
               fill=tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * f) for i in range(3)))


def render(size):
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    vgrad(d, size)  # full-bleed -> works as a maskable icon too
    d.rounded_rectangle([BUB[k] * size for k in ("l", "t", "r", "b")],
                        radius=BUB["rad"] * size, fill=BUBBLE)
    d.polygon([(x * size, y * size) for x, y in TAIL], fill=BUBBLE)

    sw = max(1, round(STROKE_FRAC * size))
    fs = round(GLYPH_H_FRAC * size * 1.7)
    font = ImageFont.truetype(FONT_PATH, fs, index=FONT_INDEX)
    bbox = d.textbbox((0, 0), GLYPH, font=font, stroke_width=sw)
    fs = round(fs * (GLYPH_H_FRAC * size) / (bbox[3] - bbox[1]))  # hit target ink height
    font = ImageFont.truetype(FONT_PATH, fs, index=FONT_INDEX)
    bbox = d.textbbox((0, 0), GLYPH, font=font, stroke_width=sw)
    gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]

    cx = (BUB["l"] + BUB["r"]) / 2 * size
    cy = (BUB["t"] + BUB["b"]) / 2 * size
    ox = cx - (bbox[0] + gw / 2) - GLYPH_SHIFT * size
    oy = cy - (bbox[1] + gh / 2)
    d.text((ox, oy), GLYPH, font=font, fill=INK, stroke_width=sw, stroke_fill=INK)

    dr = DOT_R_FRAC * size
    dcx = ox + bbox[2] + DOT_GAP_FRAC * size + dr
    dcy = oy + bbox[3] - dr
    d.ellipse([dcx - dr, dcy - dr, dcx + dr, dcy + dr], fill=INK)
    return img


def main():
    master = render(MASTER)
    sizes = {
        "icon-512.png": 512,
        "icon-192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
    }
    for name, s in sizes.items():
        im = master.resize((s, s), Image.LANCZOS)
        if name == "apple-touch-icon.png":
            im = im.convert("RGB")  # iOS dislikes alpha on apple-touch-icon
        im.save(os.path.join(PUBLIC, name))
        print("wrote public/" + name)


if __name__ == "__main__":
    main()
