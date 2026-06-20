from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PIECES = ASSETS / "pieces" / "teaching-large"
ICON_SOURCE = ASSETS / "free-chess-icon-source.png"

GREEN = "#123d34"
GREEN_DARK = "#0b241f"
GREEN_LIGHT = "#2f6d5b"
IVORY = "#f5efd9"
GOLD = "#d9a85b"
INK = "#17211d"


def chess_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for font_path in [
        "C:/Windows/Fonts/seguisym.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]:
        try:
            return ImageFont.truetype(font_path, size)
        except OSError:
            continue

    return ImageFont.load_default()


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def draw_king(draw: ImageDraw.ImageDraw, scale: float, offset: tuple[int, int]) -> None:
    ox, oy = offset

    def p(points: Iterable[tuple[float, float]]) -> list[tuple[int, int]]:
        return [(int(ox + x * scale), int(oy + y * scale)) for x, y in points]

    draw.line(
        p([(512, 188), (512, 286), (512, 286), (512, 286)]),
        fill=IVORY,
        width=max(5, int(34 * scale)),
    )
    draw.line(
        p([(462, 238), (562, 238)]),
        fill=IVORY,
        width=max(5, int(34 * scale)),
    )
    draw.ellipse(
        (
            int(ox + 426 * scale),
            int(oy + 278 * scale),
            int(ox + 598 * scale),
            int(oy + 450 * scale),
        ),
        fill=IVORY,
        outline=INK,
        width=max(2, int(7 * scale)),
    )
    draw.rounded_rectangle(
        (
            int(ox + 382 * scale),
            int(oy + 424 * scale),
            int(ox + 642 * scale),
            int(oy + 648 * scale),
        ),
        radius=int(46 * scale),
        fill=IVORY,
        outline=INK,
        width=max(2, int(7 * scale)),
    )
    draw.polygon(
        p([(392, 642), (632, 642), (690, 742), (334, 742)]),
        fill=IVORY,
        outline=INK,
    )
    draw.rounded_rectangle(
        (
            int(ox + 290 * scale),
            int(oy + 730 * scale),
            int(ox + 734 * scale),
            int(oy + 818 * scale),
        ),
        radius=int(28 * scale),
        fill=IVORY,
        outline=INK,
        width=max(2, int(7 * scale)),
    )


def draw_open_lock(draw: ImageDraw.ImageDraw, scale: float, offset: tuple[int, int]) -> None:
    ox, oy = offset
    width = max(4, int(24 * scale))
    draw.arc(
        (
            int(ox + 30 * scale),
            int(oy + 4 * scale),
            int(ox + 132 * scale),
            int(oy + 116 * scale),
        ),
        start=190,
        end=354,
        fill=GOLD,
        width=width,
    )
    draw.line(
        [
            (int(ox + 126 * scale), int(oy + 64 * scale)),
            (int(ox + 164 * scale), int(oy + 64 * scale)),
        ],
        fill=GOLD,
        width=width,
    )
    draw.rounded_rectangle(
        (
            int(ox + 56 * scale),
            int(oy + 104 * scale),
            int(ox + 174 * scale),
            int(oy + 190 * scale),
        ),
        radius=int(20 * scale),
        fill=GOLD,
    )


def save_icon(path: Path, size: int, rounded: bool) -> None:
    if ICON_SOURCE.exists():
        source = Image.open(ICON_SOURCE).convert("RGBA")
        source = center_crop_square(source).resize(
            (size, size),
            Image.Resampling.LANCZOS,
        )
        if rounded:
            output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            output.paste(source, mask=rounded_mask(size, int(size * 0.22)))
            source = output
        source.save(path)
        return

    image = Image.new("RGBA", (size, size), GREEN)
    draw = ImageDraw.Draw(image)
    unit = size / 1024

    draw.arc(
        (
            int(158 * unit),
            int(150 * unit),
            int(866 * unit),
            int(858 * unit),
        ),
        start=132,
        end=392,
        fill=GOLD,
        width=max(5, int(42 * unit)),
    )
    draw.ellipse(
        (
            int(732 * unit),
            int(214 * unit),
            int(778 * unit),
            int(260 * unit),
        ),
        fill=GOLD,
    )

    board = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    board_draw = ImageDraw.Draw(board)
    tile = int(86 * unit)
    board_x = int(326 * unit)
    board_y = int(704 * unit)
    for row in range(2):
        for col in range(4):
            color = IVORY if (row + col) % 2 == 0 else GREEN_LIGHT
            board_draw.rectangle(
                (
                    board_x + col * tile,
                    board_y + row * tile,
                    board_x + (col + 1) * tile,
                    board_y + (row + 1) * tile,
                ),
                fill=color,
            )
    board.putalpha(board.split()[-1].point(lambda value: int(value * 0.7)))
    image.alpha_composite(board)

    font = chess_font(int(640 * unit))
    draw.text(
        (int(512 * unit), int(520 * unit)),
        "♘",
        anchor="mm",
        fill=IVORY,
        font=font,
        stroke_fill=INK,
        stroke_width=max(1, int(7 * unit)),
    )

    image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120))
    if rounded:
        output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        output.paste(image, mask=rounded_mask(size, int(size * 0.22)))
        image = output
    image.save(path)


def save_adaptive_foreground(path: Path) -> None:
    if ICON_SOURCE.exists():
        source = Image.open(ICON_SOURCE).convert("RGBA")
        source = center_crop_square(source).resize((1024, 1024), Image.Resampling.LANCZOS)
        source.save(path)
        return

    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.arc((158, 150, 866, 858), start=132, end=392, fill=GOLD, width=42)
    draw.ellipse((732, 214, 778, 260), fill=GOLD)
    tile = 86
    for row in range(2):
        for col in range(4):
            color = IVORY if (row + col) % 2 == 0 else GREEN_LIGHT
            draw.rectangle(
                (
                    326 + col * tile,
                    704 + row * tile,
                    326 + (col + 1) * tile,
                    704 + (row + 1) * tile,
                ),
                fill=color,
            )
    font = chess_font(640)
    draw.text(
        (512, 520),
        "♘",
        anchor="mm",
        fill=IVORY,
        font=font,
        stroke_fill=INK,
        stroke_width=7,
    )
    image.save(path)


def save_background(path: Path) -> None:
    image = Image.new("RGBA", (1024, 1024), GREEN)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((96, 96, 928, 928), radius=190, fill=GREEN_DARK)
    image.save(path)


def save_monochrome(path: Path) -> None:
    if ICON_SOURCE.exists():
        source = Image.open(ICON_SOURCE).convert("L")
        source = center_crop_square(source).resize((1024, 1024), Image.Resampling.LANCZOS)
        alpha = source.point(lambda value: 255 if value < 245 else 0)
        mono = Image.new("RGBA", (1024, 1024), (255, 255, 255, 0))
        mono.putalpha(alpha)
        mono.save(path)
        return

    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.arc((158, 150, 866, 858), start=132, end=392, fill=IVORY, width=42)
    font = chess_font(640)
    draw.text(
        (512, 520),
        "♘",
        anchor="mm",
        fill=IVORY,
        font=font,
        stroke_width=0,
    )
    alpha = image.split()[-1]
    mono = Image.new("RGBA", image.size, (255, 255, 255, 0))
    mono.putalpha(alpha)
    mono.save(path)


def center_crop_square(image: Image.Image) -> Image.Image:
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    return image.crop((left, top, left + side, top + side))


def piece_svg(piece: str, color_name: str) -> str:
    fill = "#f8f2df" if color_name == "white" else "#18231f"
    stroke = "#18231f" if color_name == "white" else "#f8f2df"
    accent = "#d9a85b" if color_name == "white" else "#2f6d5b"
    common = f'fill="{fill}" stroke="{stroke}" stroke-width="7" stroke-linejoin="round"'

    heads = {
        "king": '<path d="M128 30v58M99 59h58"/><circle cx="128" cy="108" r="32"/>',
        "queen": '<path d="M76 94l22-48 30 46 30-46 22 48"/><circle cx="76" cy="94" r="13"/><circle cx="128" cy="78" r="13"/><circle cx="180" cy="94" r="13"/>',
        "rook": '<path d="M82 62h24V42h44v20h24v56H82z"/>',
        "bishop": '<circle cx="128" cy="82" r="30"/><path d="M128 52c20 34-13 39 9 69"/>',
        "knight": '<path d="M83 132c16-54 61-59 43-98 42 17 67 56 55 93-8 25-30 33-38 55"/>',
        "pawn": '<circle cx="128" cy="82" r="30"/>',
    }
    bases = {
        "king": '<path d="M84 142h88l-16 50h-56z"/><path d="M66 206h124v24H66z"/>',
        "queen": '<path d="M82 120h92l-16 72h-60z"/><path d="M64 206h128v24H64z"/>',
        "rook": '<path d="M90 118h76l-12 74h-52z"/><path d="M66 206h124v24H66z"/>',
        "bishop": '<path d="M92 122h72l-12 70h-48z"/><path d="M66 206h124v24H66z"/>',
        "knight": '<path d="M92 126h76l-14 66h-58z"/><path d="M66 206h124v24H66z"/>',
        "pawn": '<path d="M98 116h60l-12 76h-36z"/><path d="M72 206h112v24H72z"/>',
    }
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="38" fill="none"/>
  <g {common}>
    {heads[piece]}
    {bases[piece]}
  </g>
  <path d="M80 230h96" stroke="{accent}" stroke-width="8" stroke-linecap="round"/>
</svg>
"""


def save_piece_svgs() -> None:
    PIECES.mkdir(parents=True, exist_ok=True)
    for color in ["white", "black"]:
        for piece in ["king", "queen", "rook", "bishop", "knight", "pawn"]:
            (PIECES / f"{color}-{piece}.svg").write_text(
                piece_svg(piece, color),
                encoding="utf-8",
            )


def save_android_launcher_icons() -> None:
    if not ICON_SOURCE.exists():
        return

    res = ROOT / "android" / "app" / "src" / "main" / "res"
    if not res.exists():
        return

    source = center_crop_square(Image.open(ICON_SOURCE).convert("RGBA"))
    mono_source = center_crop_square(Image.open(ICON_SOURCE).convert("L"))
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in densities.items():
        target = res / folder
        target.mkdir(parents=True, exist_ok=True)
        icon = source.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(target / "ic_launcher.webp", "WEBP", quality=95)
        icon.save(target / "ic_launcher_round.webp", "WEBP", quality=95)
        icon.save(target / "ic_launcher_foreground.webp", "WEBP", quality=95)

        background = Image.new("RGBA", (size, size), GREEN)
        background.save(target / "ic_launcher_background.webp", "WEBP", quality=95)

        mono = mono_source.resize((size, size), Image.Resampling.LANCZOS)
        alpha = mono.point(lambda value: 255 if value < 245 else 0)
        mono_icon = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        mono_icon.putalpha(alpha)
        mono_icon.save(target / "ic_launcher_monochrome.webp", "WEBP", quality=95)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    save_icon(ASSETS / "icon.png", 1024, False)
    save_adaptive_foreground(ASSETS / "adaptive-icon.png")
    save_adaptive_foreground(ASSETS / "android-icon-foreground.png")
    save_background(ASSETS / "android-icon-background.png")
    save_monochrome(ASSETS / "android-icon-monochrome.png")
    save_icon(ASSETS / "splash-icon.png", 512, False)
    save_icon(ASSETS / "favicon.png", 128, True)
    save_piece_svgs()
    save_android_launcher_icons()


if __name__ == "__main__":
    main()
