#!/usr/bin/env python3
"""
Generate Idle brand package.

Concept: Prompt mark — a calligraphic chevron and cursor between horizontal bars.
Style: Calligraphic terminal aesthetic with ink-splatter texture. Northglass identity.

The mark represents a terminal prompt (">") drawn with brush-stroke curves, a thin
cursor line, and two subtle horizontal rules. Small ink-splatter dots add texture.

Produces all app icons, splash screens, logotype, and favicon.
"""

from PIL import Image, ImageDraw
import os
import math

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(REPO, "packages", "idle-app", "sources", "assets", "images")
GITHUB_DIR = os.path.join(REPO, ".github")

# Brand palette
BLACK = (20, 20, 22)         # Near-black for backgrounds
WHITE = (255, 255, 255)
CURSOR_GREEN = (0, 255, 65)  # Terminal green
TRANSPARENT = (0, 0, 0, 0)


# ─────────────────────────────────────────────────
# Brand mark drawing — matches the SVG in svgAssets.ts
# Elements: horizontal bars, brush chevron, cursor line, ink dots
# ─────────────────────────────────────────────────

def draw_brand_mark(draw, cx, cy, mark_size, fg_color, bar_opacity=0.3, dot_opacity=0.25):
    """
    Draw the Idle prompt mark centered at (cx, cy).
    mark_size: the bounding box size (maps to SVG viewBox 0 0 24 24).
    fg_color: base foreground color (the mark uses this + opacity variants).
    """
    s = mark_size / 24.0  # scale factor from SVG units

    # Origin (top-left of SVG viewBox mapped to canvas)
    ox = cx - mark_size / 2
    oy = cy - mark_size / 2

    # Semi-transparent color helpers
    def rgba(color, alpha):
        return color + (int(255 * alpha),)

    bar_color = rgba(fg_color, bar_opacity)
    dot_color = rgba(fg_color, dot_opacity)

    # ── Horizontal bars (top and bottom rules) ──
    bar_h = max(1, int(0.5 * s))
    bar_x0 = ox + 4 * s
    bar_x1 = ox + 20 * s

    # Top bar
    draw.rectangle([bar_x0, oy + 5.5 * s, bar_x1, oy + 5.5 * s + bar_h], fill=bar_color)
    # Bottom bar
    draw.rectangle([bar_x0, oy + 18 * s, bar_x1, oy + 18 * s + bar_h], fill=bar_color)

    # ── Ink splatter dots near bar endpoints ──
    def dot(x, y, r, alpha=dot_opacity):
        c = rgba(fg_color, alpha)
        rx = int(r * s)
        if rx < 1:
            rx = 1
        draw.ellipse([ox + x * s - rx, oy + y * s - rx,
                       ox + x * s + rx, oy + y * s + rx], fill=c)

    dot(3.8, 5.7, 0.5, 0.2)
    dot(20.3, 5.6, 0.6, 0.18)
    dot(3.7, 18.2, 0.5, 0.2)
    dot(20.2, 18.4, 0.6, 0.16)
    # Dots near chevron
    dot(10.8, 11.8, 0.6, 0.3)
    dot(11.0, 12.4, 0.4, 0.25)

    # ── Brush-stroke chevron (">") ──
    # Approximate the SVG cubic beziers with a polygon that has organic thickness
    chevron_points = []
    # The chevron has an outer path going right then back, with slight curve
    # Top arm: from (6.5, 9.5) curving to tip (9.5, 12) then back to (6.6, 14.5)
    # We draw it as a filled polygon with slight width variation for brush feel
    steps = 20
    for i in range(steps + 1):
        t = i / steps
        if t <= 0.5:
            # Top arm: (6.5, 9.5) → (9.5, 12.0)
            u = t * 2
            x = 6.5 + u * 3.0
            y = 9.5 + u * 2.5
            # Add slight outward curve (brush pressure)
            x += math.sin(u * math.pi) * 0.3
            y -= math.sin(u * math.pi) * 0.15
        else:
            # Bottom arm: (9.5, 12.0) → (6.6, 14.5)
            u = (t - 0.5) * 2
            x = 9.5 - u * 2.9
            y = 12.0 + u * 2.5
            x += math.sin(u * math.pi) * 0.3
            y += math.sin(u * math.pi) * 0.15

        chevron_points.append((ox + x * s, oy + y * s))

    # Draw as filled polygon (the stroke width comes from the path itself)
    if len(chevron_points) >= 3:
        # Thicken: create inner path offset inward
        inner_points = []
        for i in range(len(chevron_points)):
            px, py = chevron_points[i]
            # Offset toward center of mark
            dx = cx - px
            dy = cy - py
            dist = math.sqrt(dx * dx + dy * dy) or 1
            thickness = 0.7 * s  # brush thickness in SVG units
            inner_points.append((px + dx / dist * thickness, py + dy / dist * thickness))

        # Combine outer + reversed inner to make a filled stroke shape
        filled = chevron_points + list(reversed(inner_points))
        draw.polygon(filled, fill=fg_color)

    # ── Cursor line (thin vertical bar) ──
    cursor_w = max(1, int(0.7 * s))
    cursor_x = ox + 12.8 * s
    cursor_y0 = oy + 10.2 * s
    cursor_y1 = oy + 13.8 * s
    # Slight taper at ends (narrower at top/bottom)
    draw.rectangle([cursor_x - cursor_w // 2, cursor_y0,
                     cursor_x + cursor_w // 2, cursor_y1], fill=fg_color)


def draw_rounded_rect(draw, bbox, radius, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = bbox
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.pieslice([x0, y0, x0 + 2 * radius, y0 + 2 * radius], 180, 270, fill=fill)
    draw.pieslice([x1 - 2 * radius, y0, x1, y0 + 2 * radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2 * radius, x0 + 2 * radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2 * radius, y1 - 2 * radius, x1, y1], 0, 90, fill=fill)


# ─────────────────────────────────────────────────
# Pixel art letter definitions for logotype
# ─────────────────────────────────────────────────

PIXEL_LETTERS = {
    'I': [
        "######",
        "######",
        "..##..",
        "..##..",
        "..##..",
        "######",
        "######",
    ],
    'D': [
        "#####.",
        "######",
        "##..##",
        "##..##",
        "##..##",
        "######",
        "#####.",
    ],
    'L': [
        "##....",
        "##....",
        "##....",
        "##....",
        "##....",
        "######",
        "######",
    ],
    'E': [
        "######",
        "######",
        "##....",
        "#####.",
        "##....",
        "######",
        "######",
    ],
}


def draw_pixel_text(draw, text, x, y, block_size, color, gap=None):
    """Draw pixel-art text. Returns total width drawn."""
    if gap is None:
        gap = block_size
    cursor_x = x
    for ch in text:
        letter = PIXEL_LETTERS.get(ch)
        if letter is None:
            cursor_x += block_size * 2
            continue
        for row_idx, row in enumerate(letter):
            for col_idx, cell in enumerate(row):
                if cell == '#':
                    bx = cursor_x + col_idx * block_size
                    by = y + row_idx * block_size
                    draw.rectangle(
                        [bx, by, bx + block_size - 1, by + block_size - 1],
                        fill=color
                    )
        cursor_x += len(letter[0]) * block_size + gap
    return cursor_x - gap - x


# ─────────────────────────────────────────────────
# Icon: Prompt mark on dark background
# ─────────────────────────────────────────────────

def generate_app_icon():
    """
    icon.png — 1024x1024.
    Dark rounded square with the brand mark in terminal green.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    margin = 24
    corner_r = 180
    draw_rounded_rect(draw, [margin, margin, size - margin, size - margin],
                      corner_r, BLACK)

    # Brand mark centered, using green for dark background
    draw_brand_mark(draw, size // 2, size // 2 + 10,
                    mark_size=480, fg_color=CURSOR_GREEN,
                    bar_opacity=0.25, dot_opacity=0.2)

    path = os.path.join(IMAGES_DIR, "icon.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon.png ({size}x{size})")
    return img


def generate_notification_icon(app_icon):
    """
    icon-notification.png — 96x96.
    Simplified mark on transparent bg.
    """
    size = 96
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_brand_mark(draw, size // 2, size // 2,
                    mark_size=72, fg_color=CURSOR_GREEN,
                    bar_opacity=0.3, dot_opacity=0.2)

    path = os.path.join(IMAGES_DIR, "icon-notification.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-notification.png ({size}x{size})")


def generate_adaptive_icon():
    """
    icon-adaptive.png — 1024x1024, foreground for Android adaptive icons.
    Content in inner 66% safe zone.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_brand_mark(draw, size // 2, size // 2,
                    mark_size=420, fg_color=CURSOR_GREEN,
                    bar_opacity=0.25, dot_opacity=0.2)

    path = os.path.join(IMAGES_DIR, "icon-adaptive.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-adaptive.png ({size}x{size})")


def generate_monochrome_icon():
    """
    icon-monochrome.png — 1024x1024.
    White mark on transparent. Android applies themed colors.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_brand_mark(draw, size // 2, size // 2,
                    mark_size=420, fg_color=WHITE,
                    bar_opacity=0.3, dot_opacity=0.25)

    path = os.path.join(IMAGES_DIR, "icon-monochrome.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-monochrome.png ({size}x{size})")


def generate_favicon():
    """
    favicon.png — 48x48.
    Dark square with brand mark.
    """
    size = 48
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_rounded_rect(draw, [0, 0, size - 1, size - 1], 8, BLACK)

    draw_brand_mark(draw, size // 2, size // 2,
                    mark_size=36, fg_color=CURSOR_GREEN,
                    bar_opacity=0.3, dot_opacity=0.2)

    path = os.path.join(IMAGES_DIR, "favicon.png")
    img.save(path, "PNG", optimize=True)
    print(f"  favicon.png ({size}x{size})")


# ─────────────────────────────────────────────────
# Splash screens
# ─────────────────────────────────────────────────

def generate_splash_screens():
    """
    splash-android-light.png / dark.png — 288x288.
    Centered brand mark on transparent background.
    Expo handles the background color.
    """
    for variant, fg_color in [
        ("light", BLACK),
        ("dark", CURSOR_GREEN),
    ]:
        size = 288
        img = Image.new("RGBA", (size, size), TRANSPARENT)
        draw = ImageDraw.Draw(img)

        draw_brand_mark(draw, size // 2, size // 2 + 4,
                        mark_size=180, fg_color=fg_color,
                        bar_opacity=0.3, dot_opacity=0.25)

        path = os.path.join(IMAGES_DIR, f"splash-android-{variant}.png")
        img.save(path, "PNG", optimize=True)
        print(f"  splash-android-{variant}.png ({size}x{size})")


# ─────────────────────────────────────────────────
# Logotype: pixel art "IDLE"
# ─────────────────────────────────────────────────

def generate_logotype_github():
    """
    .github/logotype-dark.png — Pixel-art "IDLE" for README.
    Dark blocks on transparent bg.
    """
    block_size = 18
    letter_gap = block_size * 2
    rows = 7

    total_w = 0
    for ch in "IDLE":
        total_w += len(PIXEL_LETTERS[ch][0]) * block_size + letter_gap
    total_w -= letter_gap

    h = rows * block_size
    padding = 30

    img = Image.new("RGBA", (total_w + padding * 2, h + padding * 2), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_pixel_text(draw, "IDLE", padding, padding, block_size, BLACK, gap=letter_gap)

    path = os.path.join(GITHUB_DIR, "logotype-dark.png")
    img.save(path, "PNG", optimize=True)
    print(f"  logotype-dark.png ({img.width}x{img.height})")


def generate_logotype_app_variants():
    """
    In-app logotype images at 1x, 2x, 3x.
    Shown on auth/login screens.
    """
    for variant, fg_color, suffix in [
        ("dark", BLACK, "logotype-dark"),
        ("light", WHITE, "logotype-light"),
        ("default", BLACK, "logotype"),
    ]:
        for scale, scale_suffix in [(1, ""), (2, "@2x"), (3, "@3x")]:
            block = 4 * scale
            gap = block * 2

            total_w = 0
            for ch in "IDLE":
                total_w += len(PIXEL_LETTERS[ch][0]) * block + gap
            total_w -= gap

            h = 7 * block
            pad = 6 * scale

            img = Image.new("RGBA", (total_w + pad * 2, h + pad * 2), TRANSPARENT)
            draw = ImageDraw.Draw(img)

            draw_pixel_text(draw, "IDLE", pad, pad, block, fg_color, gap=gap)

            fname = f"{suffix}{scale_suffix}.png"
            path = os.path.join(IMAGES_DIR, fname)
            img.save(path, "PNG", optimize=True)
            if scale == 1:
                print(f"  {fname} ({img.width}x{img.height}) + @2x, @3x")


# ─────────────────────────────────────────────────
# Logo mark variants (small square for in-app use)
# ─────────────────────────────────────────────────

def generate_logo_marks():
    """
    logo-black.png / logo-white.png — Small square logo mark.
    The prompt mark without background.
    """
    for variant, fg_color in [
        ("black", BLACK),
        ("white", WHITE),
    ]:
        size = 120
        img = Image.new("RGBA", (size, size), TRANSPARENT)
        draw = ImageDraw.Draw(img)

        draw_brand_mark(draw, size // 2, size // 2,
                        mark_size=96, fg_color=fg_color,
                        bar_opacity=0.3, dot_opacity=0.25)

        path = os.path.join(IMAGES_DIR, f"logo-{variant}.png")
        img.save(path, "PNG", optimize=True)
        print(f"  logo-{variant}.png ({size}x{size})")


def generate_root_logo():
    """
    Root logo.png — 1024x1024.
    Dark circle background with green brand mark.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw.ellipse([40, 40, size - 40, size - 40], fill=BLACK)

    draw_brand_mark(draw, size // 2, size // 2 + 10,
                    mark_size=480, fg_color=CURSOR_GREEN,
                    bar_opacity=0.25, dot_opacity=0.2)

    path = os.path.join(REPO, "logo.png")
    img.save(path, "PNG", optimize=True)
    print(f"  logo.png ({size}x{size}) [repo root]")

    app_path = os.path.join(REPO, "packages", "idle-app", "logo.png")
    if os.path.exists(app_path):
        img.save(app_path, "PNG", optimize=True)
        print(f"  packages/idle-app/logo.png (copy)")


def generate_github_mascot():
    """
    .github/mascot.png — 1024x1024.
    Same as root logo.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw.ellipse([40, 40, size - 40, size - 40], fill=BLACK)

    draw_brand_mark(draw, size // 2, size // 2 + 10,
                    mark_size=480, fg_color=CURSOR_GREEN,
                    bar_opacity=0.25, dot_opacity=0.2)

    path = os.path.join(GITHUB_DIR, "mascot.png")
    img.save(path, "PNG", optimize=True)
    print(f"  mascot.png ({size}x{size})")


def generate_favicon_active():
    """favicon-active.png — 48x48 with green glow to indicate active session."""
    size = 48
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_rounded_rect(draw, [0, 0, size - 1, size - 1], 8, BLACK)

    # Glow behind mark
    glow = (0, 255, 65, 60)
    draw.ellipse([size // 2 - 14, size // 2 - 14,
                   size // 2 + 14, size // 2 + 14], fill=glow)

    draw_brand_mark(draw, size // 2, size // 2,
                    mark_size=36, fg_color=CURSOR_GREEN,
                    bar_opacity=0.3, dot_opacity=0.2)

    path = os.path.join(IMAGES_DIR, "favicon-active.png")
    img.save(path, "PNG", optimize=True)
    print(f"  favicon-active.png ({size}x{size})")


def main():
    print("=" * 50)
    print("  IDLE BRAND PACKAGE GENERATOR")
    print("  Concept: Prompt mark (chevron + cursor)")
    print("  Style: Calligraphic terminal / Northglass")
    print("=" * 50)
    print()

    os.makedirs(IMAGES_DIR, exist_ok=True)

    print("App icons:")
    app_icon = generate_app_icon()
    generate_notification_icon(app_icon)
    generate_adaptive_icon()
    generate_monochrome_icon()
    generate_favicon()
    generate_favicon_active()
    print()

    print("Splash screens:")
    generate_splash_screens()
    print()

    print("Logotypes (pixel art):")
    generate_logotype_github()
    generate_logotype_app_variants()
    print()

    print("Logo marks:")
    generate_logo_marks()
    generate_root_logo()
    generate_github_mascot()
    print()

    print("=" * 50)
    print("  Brand package complete.")
    print("=" * 50)


if __name__ == "__main__":
    main()
