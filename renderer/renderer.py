"""
renderer.py — Architext SVG renderer

Architectural drawing style:
- Hatched thick walls on exterior edges
- Thin single-line partitions on shared interior edges (geometry-detected)
- Door swing arcs, placed on interior doorways where available
- Window breaks on exterior walls only
- Dimension lines with tick marks
- Room name + area (m²) labels
- Drafting paper background with grid
- Scale bar + north arrow

UPGRADE PATH:
Shared-edge detection currently happens in _compute_shared_edges() purely from
room geometry (x, y, w, h). If layout_engine.py is upgraded to expose
ar.shared_edges natively (precomputed during layout generation), replace the
call to _compute_shared_edges(rooms) in render_svg() with a thin adapter that
reads that attribute instead — everything downstream (wall drawing, door
placement) consumes the same `shared` list shape and needs no further changes.
"""

from __future__ import annotations
from layout.layout_engine import GeneratedLayout, AssignedRoom, ADJACENCY_RULES

# Door eligibility: only cut a doorway through a shared edge if the two
# room types have an architectural reason to connect. Hallways are treated
# as a circulation spine and can always get a door to a neighbour, even
# without an explicit rule. Any other shared edge is drawn as a solid
# partition with no opening — this is the renderer-side mitigation for
# assign_rooms() not yet enforcing ADJACENCY_RULES during placement (see
# layout_engine.py follow-up).
_ADJACENCY_ALLOWED: set[tuple[str, str]] = set()
for _a, _b, _ in ADJACENCY_RULES:
    _ADJACENCY_ALLOWED.add((_a, _b))
    _ADJACENCY_ALLOWED.add((_b, _a))


def _is_door_allowed(type_a: str, type_b: str) -> bool:
    if type_a == "hallway" or type_b == "hallway":
        return True
    return (type_a, type_b) in _ADJACENCY_ALLOWED

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

WALL_T      = 8     # exterior wall stroke width (px)
INNER_WALL_T = 2.5  # interior partition stroke width (px)
HATCH_GAP   = 6     # spacing between hatch lines
DIM_OFFSET  = 14    # px — dimension line offset from room edge
SCALE       = 10    # px per 0.1m (1px = 1cm at 1:100)
EDGE_TOL    = 2.0   # px tolerance for treating two edges as touching


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

def _convert_dimension(px: int, units: str) -> float:
    """
    Converts renderer pixels into display units.
    Internal layout system uses metres.
    """
    metres = px / (SCALE * 10)

    if units == "imperial":
        return metres * 3.28084

    return metres


def _area_label(w: int, h: int, units: str) -> str:
    metres_w = w / (SCALE * 10)
    metres_h = h / (SCALE * 10)

    if units == "imperial":
        sqft = metres_w * 3.28084 * metres_h * 3.28084
        return f"{sqft:.1f} ft²"

    sqm = metres_w * metres_h
    return f"{sqm:.1f} m²"


def _dim_label(px: int, units: str) -> str:
    value = _convert_dimension(px, units)
    suffix = "ft" if units == "imperial" else "m"
    return f"{value:.1f}{suffix}"


# ---------------------------------------------------------------------------
# Shared-edge detection (geometry-based)
# ---------------------------------------------------------------------------

_OPPOSITE = {"left": "right", "right": "left", "top": "bottom", "bottom": "top"}


def _compute_shared_edges(rooms: list[AssignedRoom]) -> list[dict]:
    """
    Detects adjacent room pairs via GRID SLOT touching (col/row/col_span/
    row_span) — mirrors layout_engine._find_adjacency_pairs(). Pixel-distance
    detection doesn't work here because _compute_pixel_coords() inserts
    PADDING between every cell, so rooms never actually touch in pixel space
    even when grid-adjacent.

    The shared "fixed" coordinate is the midpoint of the padding gap between
    the two rooms, so the interior partition line floats centred in the
    cavity. Each room's own wall-band drawing still uses its own true pixel
    edge (see _room_shared_ranges / _draw_walls), so walls stay flush to the
    room regardless of gap width.

    UPGRADE PATH: if layout_engine.py starts exposing ar.shared_edges
    natively (precomputed during layout generation, ideally with zero
    padding so walls touch directly), replace this function body with a
    thin adapter — downstream consumers only depend on the returned dict
    shape (room_a/side_a/room_b/side_b/fixed/start/end), not on how it's
    computed.
    """
    shared: list[dict] = []
    n = len(rooms)
    for i in range(n):
        a = rooms[i]
        for j in range(i + 1, n):
            b = rooms[j]
            a_right  = a.slot.col + a.slot.col_span
            b_right  = b.slot.col + b.slot.col_span
            a_bottom = a.slot.row + a.slot.row_span
            b_bottom = b.slot.row + b.slot.row_span

            row_overlap = not (a_bottom <= b.slot.row or b_bottom <= a.slot.row)
            col_overlap = not (a_right <= b.slot.col or b_right <= a.slot.col)

            # Horizontal neighbours: one room's right column edge meets the other's left.
            if row_overlap and (a_right == b.slot.col or b_right == a.slot.col):
                left, right = (a, b) if a_right == b.slot.col else (b, a)
                ov_start = max(left.y, right.y)
                ov_end = min(left.y + left.h, right.y + right.h)
                if ov_end - ov_start > EDGE_TOL:
                    shared.append({
                        "room_a": left, "side_a": "right",
                        "room_b": right, "side_b": "left",
                        "fixed": (left.x + left.w + right.x) / 2,
                        "start": ov_start, "end": ov_end,
                    })

            # Vertical neighbours: one room's bottom row edge meets the other's top.
            if col_overlap and (a_bottom == b.slot.row or b_bottom == a.slot.row):
                top, bottom = (a, b) if a_bottom == b.slot.row else (b, a)
                ov_start = max(top.x, bottom.x)
                ov_end = min(top.x + top.w, bottom.x + bottom.w)
                if ov_end - ov_start > EDGE_TOL:
                    shared.append({
                        "room_a": top, "side_a": "bottom",
                        "room_b": bottom, "side_b": "top",
                        "fixed": (top.y + top.h + bottom.y) / 2,
                        "start": ov_start, "end": ov_end,
                    })
    return shared


def _room_shared_segments(ar: AssignedRoom, shared: list[dict]) -> list[dict]:
    """Per-room list of shared-edge segments, each tagged with the neighbouring room."""
    segs: list[dict] = []
    for s in shared:
        if s["room_a"] is ar:
            segs.append({"side": s["side_a"], "start": s["start"], "end": s["end"], "neighbor": s["room_b"]})
        elif s["room_b"] is ar:
            segs.append({"side": s["side_b"], "start": s["start"], "end": s["end"], "neighbor": s["room_a"]})
    return segs


def _room_shared_ranges(ar: AssignedRoom, shared: list[dict]) -> dict[str, list[tuple[float, float]]]:
    """Per-side list of (start, end) ranges along this room's perimeter that are shared with a neighbour."""
    ranges: dict[str, list[tuple[float, float]]] = {"left": [], "right": [], "top": [], "bottom": []}
    for seg in _room_shared_segments(ar, shared):
        ranges[seg["side"]].append((seg["start"], seg["end"]))
    return ranges


def _exterior_segments(full_start: float, full_end: float, shared_ranges: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Subtracts shared ranges from the full span, returning leftover exterior sub-segments."""
    if not shared_ranges:
        return [(full_start, full_end)]
    cuts = sorted(shared_ranges)
    segments: list[tuple[float, float]] = []
    cursor = full_start
    for s, e in cuts:
        s = max(s, full_start)
        e = min(e, full_end)
        if s > cursor:
            segments.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < full_end:
        segments.append((cursor, full_end))
    return [(s, e) for s, e in segments if e - s > 1]


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def _hatch_defs(out: list[str], uid: str) -> None:
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
    out.append('</defs>')


def _hatch_band(out: list[str], x: float, y: float, w: float, h: float, uid: str) -> None:
    """Draws a single exterior wall band (a thin rect) hatched and bordered."""
    if w <= 0 or h <= 0:
        return
    out.append(
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'fill="url(#{uid})"/>'
    )
    out.append(
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'fill="none" stroke="#1a1a1a" stroke-width="1.1"/>'
    )


def _draw_walls(out: list[str], ar: AssignedRoom, ranges: dict[str, list[tuple[float, float]]], ox: int, oy: int) -> None:
    """
    Edge-aware wall drawing for one room:
    - Exterior sub-segments (no neighbour on that stretch): bold hatched band.
    - Shared sub-segments are skipped here; they're drawn once, separately,
      as thin interior partitions (see _draw_interior_partitions).
    """
    rx, ry, rw, rh = ar.x + ox, ar.y + oy, ar.w, ar.h
    uid = f"h{ar.x}_{ar.y}"
    _hatch_defs(out, uid)

    # left
    for s, e in _exterior_segments(ar.y, ar.y + ar.h, ranges["left"]):
        _hatch_band(out, rx - WALL_T / 2, s + oy, WALL_T, e - s, uid)
    # right
    for s, e in _exterior_segments(ar.y, ar.y + ar.h, ranges["right"]):
        _hatch_band(out, rx + rw - WALL_T / 2, s + oy, WALL_T, e - s, uid)
    # top
    for s, e in _exterior_segments(ar.x, ar.x + ar.w, ranges["top"]):
        _hatch_band(out, s + ox, ry - WALL_T / 2, e - s, WALL_T, uid)
    # bottom
    for s, e in _exterior_segments(ar.x, ar.x + ar.w, ranges["bottom"]):
        _hatch_band(out, s + ox, ry + rh - WALL_T / 2, e - s, WALL_T, uid)


def _draw_interior_partitions(out: list[str], shared: list[dict], ox: int, oy: int) -> None:
    """Draws each shared edge once as a thin interior wall line."""
    for s in shared:
        side = s["side_a"]
        if side in ("left", "right"):
            x = s["fixed"] + ox
            out.append(
                f'<line x1="{x:.1f}" y1="{s["start"]+oy:.1f}" x2="{x:.1f}" y2="{s["end"]+oy:.1f}" '
                f'stroke="#2a2a2a" stroke-width="{INNER_WALL_T}"/>'
            )
        else:  # top/bottom
            y = s["fixed"] + oy
            out.append(
                f'<line x1="{s["start"]+ox:.1f}" y1="{y:.1f}" x2="{s["end"]+ox:.1f}" y2="{y:.1f}" '
                f'stroke="#2a2a2a" stroke-width="{INNER_WALL_T}"/>'
            )


def _door_on_edge(out: list[str], side: str, fixed: float, start: float, end: float, ox: int, oy: int, interior: bool) -> None:
    """Draws a door swing centred on a given edge segment (interior or exterior)."""
    length = end - start
    d = min(26, length * 0.5)
    if d < 8:
        return
    mid = (start + end) / 2

    if side in ("left", "right"):
        hx = fixed + ox
        hy = mid - d / 2 + oy
        lx = hx
        ly = hy + d
        out.append(f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{lx:.1f}" y2="{ly:.1f}" stroke="#333" stroke-width="1.5"/>')
        sweep_x = hx + d if side == "left" else hx - d
        out.append(f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{sweep_x:.1f}" y2="{hy:.1f}" stroke="#333" stroke-width="1.5"/>')
        sweep_flag = 1 if side == "left" else 0
        out.append(
            f'<path d="M{lx:.1f} {ly:.1f} A{d:.1f} {d:.1f} 0 0 {sweep_flag} {sweep_x:.1f} {hy:.1f}" '
            f'stroke="#555" stroke-width="0.9" fill="none" stroke-dasharray="3,2"/>'
        )
    else:
        hy = fixed + oy
        hx = mid - d / 2 + ox
        lx = hx + d
        out.append(f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{lx:.1f}" y2="{hy:.1f}" stroke="#333" stroke-width="1.5"/>')
        sweep_y = hy + d if side == "top" else hy - d
        out.append(f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{hx:.1f}" y2="{sweep_y:.1f}" stroke="#333" stroke-width="1.5"/>')
        sweep_flag = 0 if side == "top" else 1
        out.append(
            f'<path d="M{lx:.1f} {hy:.1f} A{d:.1f} {d:.1f} 0 0 {sweep_flag} {hx:.1f} {sweep_y:.1f}" '
            f'stroke="#555" stroke-width="0.9" fill="none" stroke-dasharray="3,2"/>'
        )

    # erase the wall segment under the doorway for a clean opening
    erase_w = INNER_WALL_T + 2 if interior else WALL_T + 2
    if side in ("left", "right"):
        x = fixed + ox
        out.append(
            f'<line x1="{x:.1f}" y1="{mid-d/2+oy:.1f}" x2="{x:.1f}" y2="{mid+d/2+oy:.1f}" '
            f'stroke="#fdfbf7" stroke-width="{erase_w}"/>'
        )
    else:
        y = fixed + oy
        out.append(
            f'<line x1="{mid-d/2+ox:.1f}" y1="{y:.1f}" x2="{mid+d/2+ox:.1f}" y2="{y:.1f}" '
            f'stroke="#fdfbf7" stroke-width="{erase_w}"/>'
        )


def _place_door(out: list[str], ar: AssignedRoom, shared: list[dict], ranges: dict[str, list[tuple[float, float]]], ox: int, oy: int) -> None:
    """
    Chooses a doorway for the room: prefers the longest shared (interior)
    edge segment that is architecturally eligible — i.e. connects to a
    hallway, or matches an ADJACENCY_RULES pair. Shared edges that don't
    meet that bar are left as solid partitions (no door). If no eligible
    interior edge exists, falls back to an exterior entrance on the bottom
    wall (street-facing access).
    """
    best = None  # (length, side, fixed, start, end)
    for seg in _room_shared_segments(ar, shared):
        if not _is_door_allowed(ar.room.room_type, seg["neighbor"].room.room_type):
            continue
        length = seg["end"] - seg["start"]
        fixed = {"left": ar.x, "right": ar.x + ar.w, "top": ar.y, "bottom": ar.y + ar.h}[seg["side"]]
        if best is None or length > best[0]:
            best = (length, seg["side"], fixed, seg["start"], seg["end"])

    if best:
        _, side, fixed, s, e = best
        _door_on_edge(out, side, fixed, s, e, ox, oy, interior=True)
    else:
        # No eligible interior connection — exterior entrance on the bottom wall.
        _door_on_edge(out, "bottom", ar.y + ar.h, ar.x, ar.x + ar.w, ox, oy, interior=False)


def _windows(out: list[str], ar: AssignedRoom, ranges: dict[str, list[tuple[float, float]]], ox: int, oy: int) -> None:
    """Window break, placed on the longest *exterior* horizontal (top/bottom) segment if one exists."""
    rx, ry, rw, rh = ar.x + ox, ar.y + oy, ar.w, ar.h

    top_ext = _exterior_segments(ar.x, ar.x + ar.w, ranges["top"])
    if not top_ext:
        return
    s, e = max(top_ext, key=lambda seg: seg[1] - seg[0])
    seg_w = e - s
    if seg_w < 20:
        return

    ww = min(36, seg_w * 0.6)
    cx = (s + e) / 2 + ox
    wy = ry

    out.append(
        f'<line x1="{cx - ww/2:.1f}" y1="{wy}" x2="{cx + ww/2:.1f}" y2="{wy}" '
        f'stroke="#fdfbf7" stroke-width="{WALL_T + 2}"/>'
    )
    for tx in [cx - ww / 2, cx + ww / 2]:
        out.append(
            f'<line x1="{tx:.1f}" y1="{wy - 1}" x2="{tx:.1f}" y2="{wy + WALL_T + 1}" '
            f'stroke="#1a1a1a" stroke-width="1.2"/>'
        )
    out.append(
        f'<line x1="{cx - ww/2:.1f}" y1="{wy + 2}" x2="{cx + ww/2:.1f}" y2="{wy + 2}" '
        f'stroke="#1a1a1a" stroke-width="0.8"/>'
    )
    out.append(
        f'<line x1="{cx - ww/2:.1f}" y1="{wy + WALL_T - 2}" '
        f'x2="{cx + ww/2:.1f}" y2="{wy + WALL_T - 2}" '
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
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{lx1}" y2="{ly}" stroke="#888" stroke-width="0.7"/>')
        out.append(f'<line x1="{x2}" y1="{y2}" x2="{lx2}" y2="{ly}" stroke="#888" stroke-width="0.7"/>')
        out.append(f'<line x1="{lx1}" y1="{ly}" x2="{lx2}" y2="{ly}" stroke="#444" stroke-width="0.9"/>')
        for tx in [lx1, lx2]:
            out.append(f'<line x1="{tx-3}" y1="{ly-3}" x2="{tx+3}" y2="{ly+3}" stroke="#444" stroke-width="1.1"/>')
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


def _scale_bar(
    out: list[str],
    canvas_w: int,
    y: int,
    units: str = "metric"
) -> None:
    seg = SCALE * 10
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
    unit_label = "ft" if units == "imperial" else "m"
    for i in [0, n//2, n]:
        lx = bx + i * seg
        out.append(
            f'<text x="{lx}" y="{by - 2}" text-anchor="middle" '
            f'font-size="7" font-family="Courier New,monospace" fill="#555">{i}{unit_label}</text>'
        )
    out.append(
        f'<text x="{bx + bw//2}" y="{by + 15}" text-anchor="middle" '
        f'font-size="7" font-family="Courier New,monospace" fill="#888">SCALE 1:100</text>'
    )


# ---------------------------------------------------------------------------
# Main renderer
# ---------------------------------------------------------------------------

def render_svg(
    layout: GeneratedLayout,
    title: str = "Floor Plan",
    units: str = "metric"
) -> str:
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

    # ── ADJACENCY LINES (debug/relationship overlay, label-based) ───────────
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

    # ── SHARED EDGE DETECTION (geometry-based) ───────────────────────────────
    shared = _compute_shared_edges(rooms)

    # ── ROOM FILLS + LABELS (drawn first, walls layered on top) ─────────────
    for ar in rooms:
        rx, ry, rw, rh = ar.x + ox, ar.y + oy, ar.w, ar.h
        fill, tc = ROOM_COLOURS.get(ar.room.room_type, DEFAULT_COLOURS)

        out.append(f'  <rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{fill}"/>')

        label_lines = _wrap_text(ar.room.label, max(6, rw // 9))
        area = _area_label(rw, rh, units)
        lh = 14
        total_h = len(label_lines) * lh + lh
        ty = ry + rh // 2 - total_h // 2 + lh

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

        _dim_line(out, rx, ry + rh, rx + rw, ry + rh, _dim_label(rw, units), "bottom")
        _dim_line(out, rx + rw, ry, rx + rw, ry + rh, _dim_label(rh, units), "right")

    # ── WALLS: exterior hatched bands per room, then interior partitions ────
    for ar in rooms:
        ranges = _room_shared_ranges(ar, shared)
        _draw_walls(out, ar, ranges, ox, oy)

    _draw_interior_partitions(out, shared, ox, oy)

    # ── WINDOWS + DOORS (after walls, so openings cut cleanly through them) ─
    for ar in rooms:
        ranges = _room_shared_ranges(ar, shared)
        if ar.room.room_type not in ("hallway", "bathroom", "garage", "utility"):
            _windows(out, ar, ranges, ox, oy)
        _place_door(out, ar, shared, ranges, ox, oy)

    # ── NORTH ARROW + SCALE BAR ─────────────────────────────────────────────
    _north_arrow(out, 26, H - 44)
    _scale_bar(out, W, H - 22, units)

    # ── WATERMARK ────────────────────────────────────────────────────────────
    out.append(
        f'  <text x="{W-12}" y="{H-8}" text-anchor="end" '
        f'font-size="8" font-family="Courier New,monospace" fill="#b0a898">'
        f'ARCHITEXT</text>'
    )

    out.append('</svg>')
    return "\n".join(out)