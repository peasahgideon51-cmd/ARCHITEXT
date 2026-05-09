"""
renderer.py — Architext SVG renderer

Architectural drawing style:
- Hatched thick walls
- Door swing arcs with swing line
- Window breaks on exterior walls
- Dimension lines with tick marks
- Room name + area (m²) labels
- Drafting paper background with grid
- Scale bar + north arrow
"""

from __future__ import annotations
from layout.layout_engine import GeneratedLayout, AssignedRoom

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------

ROOM_COLOURS: dict[str, tuple[str, str]] = {
    "living_room": ("#EDF7F3", "#085041"),
    "bedroom":     ("#F0EFFE", "#3C3489"),
    "kitchen":     ("#FDF4E4", "#633806"),
    "dining_room": ("#FDF6E4", "#633806"),
    "bathroom":    ("#EAF4FC", "#0C447C"),
    "study":       ("#EEF6E6", "#27500A"),
    "hallway":     ("#F5F3EE", "#4A4844"),
    "garage":      ("#F3F3F0", "#4A4844"),
    "utility":     ("#EEF5EC", "#27500A"),
    "garden":      ("#E6F5DE", "#27500A"),
}

DEFAULT_COLOURS = ("#F5F4F0", "#333333")

WALL_T      = 8     # outer wall stroke width (px)
HATCH_GAP   = 6     # spacing between hatch lines
DIM_OFFSET  = 14    # px — dimension line offset from room edge
SCALE       = 10    # px per 0.1m (1px = 1cm at 1:100)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )

def _wrap_text(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]

def _area_m2(w: int, h: int) -> str:
    area = (w / (SCALE * 10)) * (h / (SCALE * 10))
    return f"{area:.1f} m\u00b2"

def _dim_m(px: int) -> str:
    return f"{px / (SCALE * 10):.1f}m"


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def _hatch_wall(out: list[str], x: int, y: int, w: int, h: int) -> None:
    """Architectural hatched wall: hatch fills the wall band, bold outline."""
    uid  = f"h{x}_{y}"
    cid  = f"c{x}_{y}"
    ix   = x + WALL_T
    iy   = y + WALL_T
    iw   = w - WALL_T * 2
    ih   = h - WALL_T * 2

    out.append('<defs>')
    out.append(
        f'  <pattern id="{uid}" width="{HATCH_GAP}" height="{HATCH_GAP}" '
        f'patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
    )
    out.append(
        f'    <line x1="0" y1="0" x2="0" y2="{HATCH_GAP}" '
        f'stroke="#3a3a3a" stroke-width="0.7"/>'
    )
    out.append('  </pattern>')
    out.append(f'  <clipPath id="{cid}">')
    out.append(
        f'    <path fill-rule="evenodd" d="'
        f'M{x} {y} L{x+w} {y} L{x+w} {y+h} L{x} {y+h} Z '
        f'M{ix} {iy} L{ix+iw} {iy} L{ix+iw} {iy+ih} L{ix} {iy+ih} Z"/>'
    )
    out.append('  </clipPath>')
    out.append('</defs>')

    # Hatch fill in wall band
    out.append(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'fill="url(#{uid})" clip-path="url(#{cid})"/>'
    )
    # Outer border
    out.append(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
        f'fill="none" stroke="#1a1a1a" stroke-width="{WALL_T}"/>'
    )
    # Inner face line
    if iw > 0 and ih > 0:
        out.append(
            f'<rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" '
            f'fill="none" stroke="#555" stroke-width="0.6"/>'
        )


def _door(out: list[str], x: int, y: int, w: int, h: int) -> None:
    """Door swing: leaf line + quarter-circle arc, bottom-right corner."""
    d    = min(26, w // 4, h // 4)
    hx   = x + w - WALL_T - 2
    hy   = y + h - WALL_T - 2
    lx   = hx - d
    # Hinge to leaf end
    out.append(
        f'<line x1="{hx}" y1="{hy}" x2="{lx}" y2="{hy}" '
        f'stroke="#333" stroke-width="1.5"/>'
    )
    # Hinge to top of swing
    out.append(
        f'<line x1="{hx}" y1="{hy}" x2="{hx}" y2="{hy-d}" '
        f'stroke="#333" stroke-width="1.5"/>'
    )
    # Swing arc
    out.append(
        f'<path d="M{lx} {hy} A{d} {d} 0 0 1 {hx} {hy-d}" '
        f'stroke="#555" stroke-width="0.9" fill="none" stroke-dasharray="3,2"/>'
    )


def _windows(out: list[str], x: int, y: int, w: int, h: int) -> None:
    """Window break on top wall: gap + double-glazing lines."""
    ww  = min(36, w // 3)
    cx  = x + w // 2
    wy  = y

    # Erase top wall segment
    out.append(
        f'<line x1="{cx - ww//2}" y1="{wy}" x2="{cx + ww//2}" y2="{wy}" '
        f'stroke="#fdfbf7" stroke-width="{WALL_T + 2}"/>'
    )
    # Vertical jamb lines
    for tx in [cx - ww//2, cx + ww//2]:
        out.append(
            f'<line x1="{tx}" y1="{wy - 1}" x2="{tx}" y2="{wy + WALL_T + 1}" '
            f'stroke="#1a1a1a" stroke-width="1.2"/>'
        )
    # Outer glazing line
    out.append(
        f'<line x1="{cx - ww//2}" y1="{wy + 2}" x2="{cx + ww//2}" y2="{wy + 2}" '
        f'stroke="#1a1a1a" stroke-width="0.8"/>'
    )
    # Inner glazing line
    out.append(
        f'<line x1="{cx - ww//2}" y1="{wy + WALL_T - 2}" '
        f'x2="{cx + ww//2}" y2="{wy + WALL_T - 2}" '
        f'stroke="#1a1a1a" stroke-width="0.8"/>'
    )


def _dim_line(
    out: list[str],
    x1: int, y1: int,
    x2: int, y2: int,
    label: str,
    side: str,
    offset: int = DIM_OFFSET,
) -> None:
    """Dimension line with extension lines, tick marks, and centred label."""
    if side == "bottom":
        lx1, ly = x1, y1 + offset
        lx2     = x2
        # Extension lines
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{lx1}" y2="{ly}" stroke="#888" stroke-width="0.7"/>')
        out.append(f'<line x1="{x2}" y1="{y2}" x2="{lx2}" y2="{ly}" stroke="#888" stroke-width="0.7"/>')
        # Main dim line
        out.append(f'<line x1="{lx1}" y1="{ly}" x2="{lx2}" y2="{ly}" stroke="#444" stroke-width="0.9"/>')
        # Ticks
        for tx in [lx1, lx2]:
            out.append(f'<line x1="{tx-3}" y1="{ly-3}" x2="{tx+3}" y2="{ly+3}" stroke="#444" stroke-width="1.1"/>')
        # Label background + text
        mx = (lx1 + lx2) // 2
        out.append(f'<rect x="{mx-16}" y="{ly-7}" width="32" height="11" fill="#fdfbf7"/>')
        out.append(
            f'<text x="{mx}" y="{ly+2}" text-anchor="middle" '
            f'font-size="8" font-family="Courier New,monospace" fill="#333">{_escape(label)}</text>'
        )
    elif side == "right":
        lx, ly1 = x1 + offset, y1
        ly2     = y2
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{lx}" y2="{ly1}" stroke="#888" stroke-width="0.7"/>')
        out.append(f'<line x1="{x2}" y1="{y2}" x2="{lx}" y2="{ly2}" stroke="#888" stroke-width="0.7"/>')
        out.append(f'<line x1="{lx}" y1="{ly1}" x2="{lx}" y2="{ly2}" stroke="#444" stroke-width="0.9"/>')
        for ty in [ly1, ly2]:
            out.append(f'<line x1="{lx-3}" y1="{ty-3}" x2="{lx+3}" y2="{ty+3}" stroke="#444" stroke-width="1.1"/>')
        my = (ly1 + ly2) // 2
        out.append(f'<rect x="{lx-16}" y="{my-7}" width="32" height="11" fill="#fdfbf7"/>')
        out.append(
            f'<text x="{lx}" y="{my+2}" text-anchor="middle" '
            f'font-size="8" font-family="Courier New,monospace" fill="#333" '
            f'transform="rotate(-90,{lx},{my})">{_escape(label)}</text>'
        )


def _north_arrow(out: list[str], x: int, y: int) -> None:
    """Architectural north arrow: two-tone filled arrowhead."""
    out.append(
        f'<polygon points="{x},{y-14} {x-6},{y+6} {x},{y+1} {x+6},{y+6}" '
        f'fill="#1a1a1a" stroke="#1a1a1a" stroke-width="0.5"/>'
    )
    out.append(
        f'<polygon points="{x},{y-14} {x-6},{y+6} {x},{y+1}" '
        f'fill="white" stroke="#1a1a1a" stroke-width="0.5"/>'
    )
    out.append(
        f'<text x="{x}" y="{y+20}" text-anchor="middle" '
        f'font-size="9" font-family="Courier New,monospace" '
        f'font-weight="700" fill="#1a1a1a">N</text>'
    )


def _scale_bar(out: list[str], canvas_w: int, y: int) -> None:
    """5-segment scale bar: each segment = 1 metre."""
    seg = SCALE * 10   # px per metre
    n   = 5
    bw  = seg * n
    bx  = canvas_w - bw - 18
    by  = y
    for i in range(n):
        fill = "#1a1a1a" if i % 2 == 0 else "#ffffff"
        out.append(
            f'<rect x="{bx + i*seg}" y="{by}" width="{seg}" height="5" '
            f'fill="{fill}" stroke="#1a1a1a" stroke-width="0.7"/>'
        )
    for i in [0, n//2, n]:
        lx = bx + i * seg
        out.append(
            f'<text x="{lx}" y="{by - 2}" text-anchor="middle" '
            f'font-size="7" font-family="Courier New,monospace" fill="#555">{i}m</text>'
        )
    out.append(
        f'<text x="{bx + bw//2}" y="{by + 15}" text-anchor="middle" '
        f'font-size="7" font-family="Courier New,monospace" fill="#888">SCALE 1:100</text>'
    )


# ---------------------------------------------------------------------------
# Main renderer
# ---------------------------------------------------------------------------

def render_svg(layout: GeneratedLayout, title: str = "Floor Plan") -> str:
    """Render a GeneratedLayout as an architectural SVG floor plan."""

    DIM_MARGIN = 50
    W = layout.canvas_w + DIM_MARGIN
    H = layout.canvas_h + DIM_MARGIN + 44
    ox = DIM_MARGIN // 2
    oy = DIM_MARGIN // 2

    rooms = layout.assigned_rooms
    pairs = layout.adjacency_pairs
    out: list[str] = []

    # ── HEADER ──────────────────────────────────────────────────────────────
    out.append(
        f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
        f'width="{W}" height="{H}" role="img">'
    )
    out.append(f'  <title>{_escape(title)}</title>')
    out.append(f'  <desc>Architext floor plan: {_escape(title)}</desc>')

    # ── BACKGROUND ──────────────────────────────────────────────────────────
    out.append(f'  <rect width="{W}" height="{H}" fill="#fdfbf7"/>')

    out.append('  <defs>')
    out.append(
        '    <pattern id="mgrid" width="5" height="5" patternUnits="userSpaceOnUse">'
        '<path d="M5 0L0 0 0 5" fill="none" stroke="#ece8df" stroke-width="0.3"/>'
        '</pattern>'
    )
    out.append(
        '    <pattern id="Mgrid" width="25" height="25" patternUnits="userSpaceOnUse">'
        '<rect width="25" height="25" fill="url(#mgrid)"/>'
        '<path d="M25 0L0 0 0 25" fill="none" stroke="#ddd7cc" stroke-width="0.5"/>'
        '</pattern>'
    )
    out.append('  </defs>')
    out.append(f'  <rect width="{W}" height="{H}" fill="url(#Mgrid)"/>')

    # Drawing border (double line)
    out.append(
        f'  <rect x="5" y="5" width="{W-10}" height="{H-10}" '
        f'fill="none" stroke="#b0a898" stroke-width="1.5"/>'
    )
    out.append(
        f'  <rect x="9" y="9" width="{W-18}" height="{H-18}" '
        f'fill="none" stroke="#c8c0b4" stroke-width="0.5"/>'
    )

    # ── TITLE BLOCK ─────────────────────────────────────────────────────────
    out.append(
        f'  <text x="{W//2}" y="28" text-anchor="middle" '
        f'font-size="13" font-family="Courier New,monospace" '
        f'font-weight="700" fill="#1a1a1a" letter-spacing="3">'
        f'{_escape(title.upper())}</text>'
    )
    out.append(
        f'  <line x1="{W//2-70}" y1="32" x2="{W//2+70}" y2="32" '
        f'stroke="#999" stroke-width="0.6"/>'
    )

    # ── ADJACENCY LINES ─────────────────────────────────────────────────────
    label_map = {ar.room.label: ar for ar in rooms}
    for la, lb in pairs:
        a = label_map.get(la)
        b = label_map.get(lb)
        if not a or not b:
            continue
        out.append(
            f'  <line '
            f'x1="{a.x+ox+a.w//2}" y1="{a.y+oy+a.h//2}" '
            f'x2="{b.x+ox+b.w//2}" y2="{b.y+oy+b.h//2}" '
            f'stroke="#aaa9e0" stroke-width="1" '
            f'stroke-dasharray="4,4" opacity="0.25"/>'
        )

    # ── ROOMS ────────────────────────────────────────────────────────────────
    for ar in rooms:
        rx = ar.x + ox
        ry = ar.y + oy
        rw = ar.w
        rh = ar.h
        fill, tc = ROOM_COLOURS.get(ar.room.room_type, DEFAULT_COLOURS)

        # Fill
        out.append(
            f'  <rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{fill}"/>'
        )

        # Hatched walls
        _hatch_wall(out, rx, ry, rw, rh)

        # Window (exterior rooms only)
        if ar.room.room_type not in ("hallway", "bathroom", "garage", "utility"):
            _windows(out, rx, ry, rw, rh)

        # Door swing
        _door(out, rx, ry, rw, rh)

        # Room name + area label
        label_lines = _wrap_text(ar.room.label, max(6, rw // 9))
        area        = _area_m2(rw, rh)
        lh          = 14
        total_h     = len(label_lines) * lh + lh  # +1 for area line
        ty          = ry + rh // 2 - total_h // 2 + lh

        for i, line in enumerate(label_lines):
            out.append(
                f'  <text x="{rx+rw//2}" y="{ty + i*lh}" '
                f'text-anchor="middle" font-size="10" '
                f'font-family="Courier New,monospace" '
                f'fill="{tc}" font-weight="700" letter-spacing="0.5">'
                f'{_escape(line)}</text>'
            )

        out.append(
            f'  <text x="{rx+rw//2}" y="{ty + len(label_lines)*lh}" '
            f'text-anchor="middle" font-size="8" '
            f'font-family="Courier New,monospace" fill="#777">'
            f'{_escape(area)}</text>'
        )

        # Dimension lines
        _dim_line(out, rx, ry+rh, rx+rw, ry+rh, _dim_m(rw), "bottom")
        _dim_line(out, rx+rw, ry, rx+rw, ry+rh, _dim_m(rh), "right")

    # ── NORTH ARROW + SCALE BAR ─────────────────────────────────────────────
    _north_arrow(out, 26, H - 44)
    _scale_bar(out, W, H - 22)

    # ── WATERMARK ────────────────────────────────────────────────────────────
    out.append(
        f'  <text x="{W-12}" y="{H-8}" text-anchor="end" '
        f'font-size="8" font-family="Courier New,monospace" fill="#b0a898">'
        f'ARCHITEXT</text>'
    )

    out.append('</svg>')
    return "\n".join(out)