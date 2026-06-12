"""
Generate translation-themed extension icons as PNG files.
Clean design: blue rounded-square with white document + arrow motif.
Stdlib only — no PIL required.
"""
import struct
import zlib
import os
import math


def make_png(width, height, pixels):
    """Encode RGBA pixel grid (list of rows of (r,g,b,a) tuples) into PNG bytes."""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    raw = b''
    for row in pixels:
        raw += b'\x00'
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) +
            chunk(b'IDAT', zlib.compress(raw)) +
            chunk(b'IEND', b''))


def inside_circle(cx, cy, r, x, y):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2


def rounded_box(x, y, w, h, r, px, py):
    """True if (px,py) falls inside rounded rect anchored at (x,y)."""
    if x + r <= px <= x + w - r and y <= py <= y + h:
        return True
    if x <= px <= x + w and y + r <= py <= y + h - r:
        return True
    for cx, cy in [(x + r, y + r), (x + w - r, y + r),
                   (x + r, y + h - r), (x + w - r, y + h - r)]:
        if (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2:
            return True
    return False


ICON_BLUE = (26, 115, 232, 255)     # #1A73E8
ICON_LIGHT_BLUE = (66, 133, 244, 255)  # lighter accent
WHITE = (255, 255, 255, 255)
WHITE_70 = (255, 255, 255, 180)
TRANSPARENT = (0, 0, 0, 0)


def make_icon(size):
    """Render a translation icon at given square size."""
    S = size
    C = (S - 1) / 2.0          # canvas centre
    BG_R = S * 0.44            # background circle radius
    MARGIN = int(S * 0.04)

    def doc_mask(px, py, cx, cy, w, h, cr):
        """Test point (px,py) against a rounded-rect document centred at (cx,cy)."""
        x0 = cx - w / 2
        y0 = cy - h / 2
        return rounded_box(x0, y0, w, h, cr, px, py)

    # ── Build rows ──────────────────────────────
    rows = []
    for py in range(S):
        row = []
        for px in range(S):
            # Normalised coords relative to centre, [-1..1]
            nx = (px - C) / BG_R
            ny = (py - C) / BG_R

            if not inside_circle(C, C, BG_R, px, py):
                row.append(TRANSPARENT)
                continue

            # ── Background default ────────────
            row.append(ICON_BLUE)

            # ── Left document ──────────────────
            doc_size_w = BG_R * 1.08
            doc_size_h = BG_R * 1.22
            doc_cr = BG_R * 0.18
            left_cx = C - BG_R * 0.28
            left_cy = C + BG_R * 0.04

            in_left = doc_mask(px, py, left_cx, left_cy, doc_size_w, doc_size_h, doc_cr)

            # ── Right document ─────────────────
            right_cx = C + BG_R * 0.32
            right_cy = C + BG_R * 0.22
            in_right = doc_mask(px, py, right_cx, right_cy, doc_size_w * 0.9, doc_size_h * 0.9, doc_cr)

            if in_left and in_right:
                row[-1] = WHITE
                continue
            elif in_left:
                row[-1] = WHITE
                # ── Text lines on left doc ─────
                left_x = (px - left_cx) / (doc_size_w / 2)
                left_y = (py - left_cy) / (doc_size_h / 2)
                lines = [(-0.52, 0.55), (-0.24, 0.65), (0.04, 0.42), (0.32, 0.52)]
                for ly, lw in lines:
                    if abs(left_y - ly) < 0.055 and abs(left_x) < lw:
                        row[-1] = ICON_BLUE
                        break
                continue
            elif in_right:
                row[-1] = WHITE
                # ── Text lines on right doc ─────
                right_x = (px - right_cx) / (doc_size_w / 2)
                right_y = (py - right_cy) / (doc_size_h / 2)
                lines = [(-0.48, 0.48), (-0.20, 0.58), (0.08, 0.38), (0.36, 0.45)]
                for ly, lw in lines:
                    if abs(right_y - ly) < 0.055 and abs(right_x) < lw:
                        row[-1] = ICON_BLUE
                        break
                continue

            # ── Arrow icon between docs ────────
            ax_c = C + BG_R * 0.02
            ay_c = C - BG_R * 0.30
            arx = (px - ax_c) / (BG_R * 0.5)
            ary = (py - ay_c) / (BG_R * 0.5)

            # Arrow shaft (horizontal bar)
            if abs(ary) < 0.15 and -0.6 < arx < 0.5:
                row[-1] = WHITE
            # Arrow head (triangle pointing right)
            if 0.3 < arx < 0.8 and abs(ary) < (arx - 0.1) * 1.1:
                row[-1] = WHITE

        rows.append(row)

    return rows


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(base, 'icons')
    os.makedirs(out_dir, exist_ok=True)

    for size in [16, 48, 128]:
        px = make_icon(size)
        data = make_png(size, size, px)
        path = os.path.join(out_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  icon{size}.png  {size}×{size}  {len(data):,} bytes')


if __name__ == '__main__':
    main()
