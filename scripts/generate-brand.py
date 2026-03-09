#!/usr/bin/env python3
"""
Generate Idle brand package.

Concept: Terminal cursor at rest. A blinking cursor waiting for input = "idle".
Style: Brutalist/pixel, hackery, clean, minimalist. Block-art aesthetic
       with Northglass identity.

Produces all app icons, splash screens, logotype, and favicon.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(REPO, "packages", "idle-app", "sources", "assets", "images")
GITHUB_DIR = os.path.join(REPO, ".github")

# Brand palette
BLACK = (20, 20, 22)         # Near-black for backgrounds
WHITE = (255, 255, 255)
CURSOR_GREEN = (0, 255, 65)  # Terminal green
DARK_BG = (30, 30, 32)       # Dark mode bg
LIGHT_BG = (245, 245, 245)   # Light mode bg
TRANSPARENT = (0, 0, 0, 0)

# ─────────────────────────────────────────────────
# Pixel art letter definitions (7 rows x variable cols)
# Each letter is a list of 7 strings, '#' = filled, '.' = empty
# Thick, blocky, geometric pixel art style
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
        gap = block_size  # Gap between letters
    cursor_x = x
    for ch in text:
        letter = PIXEL_LETTERS.get(ch)
        if letter is None:
            cursor_x += block_size * 2  # space
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
# Icon: Terminal window with blinking cursor
# ─────────────────────────────────────────────────

def generate_app_icon():
    """
    icon.png — 1024x1024.
    Dark rounded square (terminal window) with a bright green block cursor.
    Minimal, instant recognition.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Dark rounded rectangle background (with margin for app store rounding)
    margin = 24
    corner_r = 180
    draw_rounded_rect(draw, [margin, margin, size - margin, size - margin],
                      corner_r, BLACK)

    # Blinking block cursor — centered, slightly left-of-center for visual interest
    # The cursor is THE brand mark
    cursor_w = 120
    cursor_h = 280
    cx = size // 2 - cursor_w // 2 - 20  # slightly left
    cy = size // 2 - cursor_h // 2 + 30  # slightly below center (terminal feel)
    draw.rectangle([cx, cy, cx + cursor_w, cy + cursor_h], fill=CURSOR_GREEN)

    # Subtle prompt hint: a small ">" to the left of cursor
    prompt_size = 80
    px = cx - 180
    py = cy + (cursor_h - prompt_size) // 2
    # Draw ">" as two lines
    draw.polygon([
        (px, py),
        (px + prompt_size, py + prompt_size // 2),
        (px, py + prompt_size)
    ], fill=(80, 80, 84))

    path = os.path.join(IMAGES_DIR, "icon.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon.png ({size}x{size})")
    return img


def generate_notification_icon(app_icon):
    """
    icon-notification.png — 96x96.
    Simplified: just the cursor on transparent bg.
    """
    size = 96
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Just the cursor block
    cursor_w = 24
    cursor_h = 56
    cx = size // 2 - cursor_w // 2
    cy = size // 2 - cursor_h // 2 + 4
    draw.rectangle([cx, cy, cx + cursor_w, cy + cursor_h], fill=CURSOR_GREEN)

    path = os.path.join(IMAGES_DIR, "icon-notification.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-notification.png ({size}x{size})")


def generate_adaptive_icon():
    """
    icon-adaptive.png — 1024x1024, foreground for Android adaptive icons.
    Content in inner 66% safe zone. Transparent background.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Cursor in the safe zone center
    cursor_w = 100
    cursor_h = 240
    cx = size // 2 - cursor_w // 2 - 16
    cy = size // 2 - cursor_h // 2 + 24
    draw.rectangle([cx, cy, cx + cursor_w, cy + cursor_h], fill=CURSOR_GREEN)

    # Prompt ">"
    prompt_size = 68
    px = cx - 150
    py = cy + (cursor_h - prompt_size) // 2
    draw.polygon([
        (px, py),
        (px + prompt_size, py + prompt_size // 2),
        (px, py + prompt_size)
    ], fill=(80, 80, 84))

    path = os.path.join(IMAGES_DIR, "icon-adaptive.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-adaptive.png ({size}x{size})")


def generate_monochrome_icon():
    """
    icon-monochrome.png — 1024x1024.
    White cursor silhouette on transparent. Android applies themed colors.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Simple cursor block + prompt as white shapes
    cursor_w = 100
    cursor_h = 240
    cx = size // 2 - cursor_w // 2 - 16
    cy = size // 2 - cursor_h // 2 + 24
    draw.rectangle([cx, cy, cx + cursor_w, cy + cursor_h], fill=WHITE)

    prompt_size = 68
    px = cx - 150
    py = cy + (cursor_h - prompt_size) // 2
    draw.polygon([
        (px, py),
        (px + prompt_size, py + prompt_size // 2),
        (px, py + prompt_size)
    ], fill=WHITE)

    path = os.path.join(IMAGES_DIR, "icon-monochrome.png")
    img.save(path, "PNG", optimize=True)
    print(f"  icon-monochrome.png ({size}x{size})")


def generate_favicon():
    """
    favicon.png — 48x48.
    Dark square with green cursor. Reads well at small sizes.
    """
    size = 48
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Dark background
    draw_rounded_rect(draw, [0, 0, size - 1, size - 1], 8, BLACK)

    # Cursor
    cw, ch = 8, 20
    cx = size // 2 - cw // 2
    cy = size // 2 - ch // 2 + 2
    draw.rectangle([cx, cy, cx + cw, cy + ch], fill=CURSOR_GREEN)

    path = os.path.join(IMAGES_DIR, "favicon.png")
    img.save(path, "PNG", optimize=True)
    print(f"  favicon.png ({size}x{size})")


# ─────────────────────────────────────────────────
# Splash screens
# ─────────────────────────────────────────────────

def generate_splash_screens():
    """
    splash-android-light.png / dark.png — 288x288.
    Centered brand mark (cursor + prompt) on solid backgrounds.
    Expo handles the background color; this is just the centered image.
    """
    for variant, bg, cursor_color, prompt_color in [
        ("light", TRANSPARENT, BLACK, (160, 160, 164)),
        ("dark", TRANSPARENT, CURSOR_GREEN, (80, 80, 84)),
    ]:
        size = 288
        img = Image.new("RGBA", (size, size), bg)
        draw = ImageDraw.Draw(img)

        # Cursor
        cw, ch = 36, 84
        cx = size // 2 - cw // 2
        cy = size // 2 - ch // 2 + 8
        draw.rectangle([cx, cy, cx + cw, cy + ch], fill=cursor_color)

        # Prompt ">"
        ps = 24
        px = cx - 52
        py = cy + (ch - ps) // 2
        draw.polygon([
            (px, py),
            (px + ps, py + ps // 2),
            (px, py + ps)
        ], fill=prompt_color)

        path = os.path.join(IMAGES_DIR, f"splash-android-{variant}.png")
        img.save(path, "PNG", optimize=True)
        print(f"  splash-android-{variant}.png ({size}x{size})")


# ─────────────────────────────────────────────────
# Logotype: pixel art "IDLE"
# ─────────────────────────────────────────────────

def generate_logotype_github():
    """
    .github/logotype-dark.png — Pixel-art "IDLE" for README.
    Dark blocks on transparent bg, brutalist pixel-art style.
    """
    block_size = 18
    letter_gap = block_size * 2
    rows = 7

    # Calculate total width
    total_w = 0
    for ch in "IDLE":
        total_w += len(PIXEL_LETTERS[ch][0]) * block_size + letter_gap
    total_w -= letter_gap  # no trailing gap

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
    These are shown on auth/login screens.
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
# Logo mark variants (small square logo for in-app use)
# ─────────────────────────────────────────────────

def generate_logo_marks():
    """
    logo-black.png / logo-white.png — Small square logo mark.
    The cursor icon without the terminal window background.
    """
    for variant, cursor_color, prompt_color in [
        ("black", BLACK, (120, 120, 124)),
        ("white", WHITE, (200, 200, 204)),
    ]:
        size = 120
        img = Image.new("RGBA", (size, size), TRANSPARENT)
        draw = ImageDraw.Draw(img)

        cw, ch = 20, 48
        cx = size // 2 - cw // 2
        cy = size // 2 - ch // 2 + 4
        draw.rectangle([cx, cy, cx + cw, cy + ch], fill=cursor_color)

        ps = 16
        px = cx - 34
        py = cy + (ch - ps) // 2
        draw.polygon([
            (px, py),
            (px + ps, py + ps // 2),
            (px, py + ps)
        ], fill=prompt_color)

        path = os.path.join(IMAGES_DIR, f"logo-{variant}.png")
        img.save(path, "PNG", optimize=True)
        print(f"  logo-{variant}.png ({size}x{size})")


def generate_root_logo():
    """
    Replace repo root logo.png with the new brand mark.
    1024x1024, dark bg with green cursor — the canonical brand image.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    # Full dark circle background
    draw.ellipse([40, 40, size - 40, size - 40], fill=BLACK)

    # Cursor
    cw, ch = 100, 240
    cx = size // 2 - cw // 2
    cy = size // 2 - ch // 2 + 24
    draw.rectangle([cx, cy, cx + cw, cy + ch], fill=CURSOR_GREEN)

    # Prompt
    ps = 68
    px = cx - 150
    py = cy + (ch - ps) // 2
    draw.polygon([
        (px, py),
        (px + ps, py + ps // 2),
        (px, py + ps)
    ], fill=(80, 80, 84))

    path = os.path.join(REPO, "logo.png")
    img.save(path, "PNG", optimize=True)
    print(f"  logo.png ({size}x{size}) [repo root]")

    # Also copy to packages/idle-app/logo.png
    app_path = os.path.join(REPO, "packages", "idle-app", "logo.png")
    if os.path.exists(app_path):
        img.save(app_path, "PNG", optimize=True)
        print(f"  packages/idle-app/logo.png (copy)")


# ─────────────────────────────────────────────────
# GitHub mascot replacement
# ─────────────────────────────────────────────────

def generate_github_mascot():
    """
    .github/mascot.png — 1024x1024.
    Same as root logo — the canonical brand image.
    """
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw.ellipse([40, 40, size - 40, size - 40], fill=BLACK)

    cw, ch = 100, 240
    cx = size // 2 - cw // 2
    cy = size // 2 - ch // 2 + 24
    draw.rectangle([cx, cy, cx + cw, cy + ch], fill=CURSOR_GREEN)

    ps = 68
    px = cx - 150
    py = cy + (ch - ps) // 2
    draw.polygon([
        (px, py),
        (px + ps, py + ps // 2),
        (px, py + ps)
    ], fill=(80, 80, 84))

    path = os.path.join(GITHUB_DIR, "mascot.png")
    img.save(path, "PNG", optimize=True)
    print(f"  mascot.png ({size}x{size})")


# ─────────────────────────────────────────────────
# Favicon for active state (existing file, replace)
# ─────────────────────────────────────────────────

def generate_favicon_active():
    """favicon-active.png — 48x48 with green glow to indicate active session."""
    size = 48
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    draw_rounded_rect(draw, [0, 0, size - 1, size - 1], 8, BLACK)

    # Cursor with green glow effect (draw slightly larger green rect behind)
    cw, ch = 8, 20
    cx = size // 2 - cw // 2
    cy = size // 2 - ch // 2 + 2
    # Glow
    glow = (0, 255, 65, 80)
    draw.rectangle([cx - 3, cy - 3, cx + cw + 3, cy + ch + 3], fill=glow)
    # Cursor
    draw.rectangle([cx, cy, cx + cw, cy + ch], fill=CURSOR_GREEN)

    path = os.path.join(IMAGES_DIR, "favicon-active.png")
    img.save(path, "PNG", optimize=True)
    print(f"  favicon-active.png ({size}x{size})")


def main():
    print("=" * 50)
    print("  IDLE BRAND PACKAGE GENERATOR")
    print("  Concept: Terminal cursor at rest")
    print("  Style: Brutalist / hackery / minimal")
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
