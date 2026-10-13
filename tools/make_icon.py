"""Generate the HF TC application icon (assets/hftc.ico + assets/hftc_icon.png).

Optional developer tool - needs Pillow:
    pip install pillow
    python tools/make_icon.py

The build script (build_windows.py) picks up assets/hftc.ico automatically;
if the icons are absent the build simply runs without a custom icon.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

NAVY = (15, 42, 74, 255)
TEAL = (31, 158, 150, 255)
MINT = (146, 222, 216, 255)
WHITE = (255, 255, 255, 255)


def _font(size: int):
    from PIL import ImageFont
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "C:/Windows/Fonts/segoeuib.ttf",
              "C:/Windows/Fonts/arialbd.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def build(size: int = 512):
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.1875)
    d.rounded_rectangle([0, 0, size, size], radius=r, fill=NAVY)
    d.rounded_rectangle([size * 0.035, size * 0.035, size * 0.965, size * 0.965],
                        radius=int(r * 0.85), outline=TEAL, width=max(2, size // 51))
    d.rounded_rectangle([size * 0.137, size * 0.742, size * 0.863, size * 0.820],
                        radius=int(size * 0.039), fill=TEAL)
    f1 = _font(int(size * 0.449))
    bb = d.textbbox((0, 0), "HF", font=f1)
    d.text(((size - (bb[2] - bb[0])) / 2 - bb[0],
            (size - (bb[3] - bb[1])) / 2 - bb[1] - size * 0.113), "HF", font=f1, fill=WHITE)
    f2 = _font(int(size * 0.1875))
    bb2 = d.textbbox((0, 0), "TC", font=f2)
    d.text(((size - (bb2[2] - bb2[0])) / 2 - bb2[0], size * 0.586), "TC", font=f2, fill=MINT)
    return img


def main() -> int:
    try:
        import PIL  # noqa: F401
    except ImportError:
        print("Pillow install nahi hai. Chalayein:  pip install pillow")
        return 1

    ASSETS.mkdir(parents=True, exist_ok=True)
    img = build(512)
    img.save(ASSETS / "hftc_icon.png")
    img.save(ASSETS / "hftc.ico",
             sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Icon ban gaya: {ASSETS / 'hftc.ico'}  aur  {ASSETS / 'hftc_icon.png'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
