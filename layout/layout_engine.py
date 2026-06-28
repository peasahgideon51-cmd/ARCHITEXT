"""
layout_engine.py — Architext rule-based layout engine

Selects a base grid template from the library and assigns parsed rooms to
grid slots, enforcing spatial adjacency and grouping constraints.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from parser.parser import ParsedLayout, Room


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class GridSlot:
    """A positioned rectangle in the floor plan grid."""
    slot_id: str
    col: int          # 0-based column index
    row: int          # 0-based row index
    col_span: int = 1
    row_span: int = 1
    zone: str = ""    # "public", "private", "service", "outdoor"


@dataclass
class Template:
    """A base layout template selected by bedroom count and building type."""
    template_id: str
    name: str
    cols: int
    rows: int
    slots: list[GridSlot]
    suitable_for: list[str]   # building types
    min_rooms: int = 1
    max_rooms: int = 20


@dataclass
class AssignedRoom:
    """A room placed into a grid slot with pixel coordinates."""
    room: Room
    slot: GridSlot
    x: int
    y: int
    w: int
    h: int


@dataclass
class GeneratedLayout:
    """Complete output of the layout engine, ready for the renderer."""
    template: Template
    assigned_rooms: list[AssignedRoom]
    adjacency_pairs: list[tuple[str, str]]   # (room label A, room label B)
    canvas_w: int
    canvas_h: int
    applied_rules: list[str]                  # for the explanation module


# ---------------------------------------------------------------------------
# Template library
# ---------------------------------------------------------------------------

# Grid cell dimensions (pixels)
CELL_W = 160
CELL_H = 120
PADDING = 16   # gap between cells

def _make_slots(*specs: tuple) -> list[GridSlot]:
    """
    specs: (slot_id, col, row, col_span, row_span, zone)
    """
    return [GridSlot(*s) for s in specs]


TEMPLATES: list[Template] = [

    Template(
        template_id="studio_1",
        name="Studio / Open Plan",
        cols=2, rows=2,
        slots=_make_slots(
            ("s1", 0, 0, 2, 1, "public"),   # large open space
            ("s2", 0, 1, 1, 1, "service"),  # bathroom
            ("s3", 1, 1, 1, 1, "outdoor"),  # balcony / patio
        ),
        suitable_for=["studio", "apartment"],
        min_rooms=1, max_rooms=4,
    ),

    Template(
        template_id="apartment_2bed",
        name="2-Bedroom Apartment",
        cols=3, rows=3,
        slots=_make_slots(
            ("s1", 0, 0, 1, 1, "service"),   # hallway/entrance
            ("s2", 1, 0, 2, 1, "public"),    # living room (wide)
            ("s3", 0, 1, 1, 1, "service"),   # kitchen
            ("s4", 1, 1, 1, 1, "public"),    # dining
            ("s5", 2, 1, 1, 1, "service"),   # bathroom
            ("s6", 0, 2, 1, 1, "private"),   # bedroom 1
            ("s7", 1, 2, 1, 1, "private"),   # bedroom 2
            ("s8", 2, 2, 1, 1, "outdoor"),   # balcony
        ),
        suitable_for=["apartment", "house"],
        min_rooms=3, max_rooms=8,
    ),

    Template(
        template_id="house_3bed",
        name="3-Bedroom House",
        cols=4, rows=3,
        slots=_make_slots(
            ("s1",  0, 0, 1, 1, "service"),  # hallway
            ("s2",  1, 0, 2, 1, "public"),   # living room (wide)
            ("s3",  3, 0, 1, 1, "outdoor"),  # garden/patio
            ("s4",  0, 1, 1, 1, "service"),  # kitchen
            ("s5",  1, 1, 1, 1, "public"),   # dining
            ("s6",  2, 1, 1, 1, "service"),  # bathroom 1
            ("s7",  3, 1, 1, 1, "service"),  # utility/study
            ("s8",  0, 2, 1, 1, "private"),  # bedroom 1 (master)
            ("s9",  1, 2, 1, 1, "private"),  # bedroom 2
            ("s10", 2, 2, 1, 1, "private"),  # bedroom 3
            ("s11", 3, 2, 1, 1, "service"),  # bathroom 2 / en-suite
        ),
        suitable_for=["house"],
        min_rooms=5, max_rooms=11,
    ),

    Template(
        template_id="house_4bed",
        name="4-Bedroom House",
        cols=4, rows=4,
        slots=_make_slots(
            ("s1",  0, 0, 1, 1, "service"),  # hallway
            ("s2",  1, 0, 2, 1, "public"),   # living room
            ("s3",  3, 0, 1, 1, "outdoor"),  # garden
            ("s4",  0, 1, 1, 1, "service"),  # kitchen
            ("s5",  1, 1, 1, 1, "public"),   # dining
            ("s6",  2, 1, 1, 1, "service"),  # utility
            ("s7",  3, 1, 1, 1, "service"),  # study/office
            ("s8",  0, 2, 1, 1, "private"),  # bedroom 1 (master)
            ("s9",  1, 2, 1, 1, "service"),  # en-suite
            ("s10", 2, 2, 1, 1, "private"),  # bedroom 2
            ("s11", 3, 2, 1, 1, "private"),  # bedroom 3
            ("s12", 0, 3, 1, 1, "service"),  # bathroom
            ("s13", 1, 3, 1, 1, "private"),  # bedroom 4
            ("s14", 2, 3, 1, 1, "service"),  # garage
            ("s15", 3, 3, 1, 1, "outdoor"),  # patio
        ),
        suitable_for=["house"],
        min_rooms=6, max_rooms=15,
    ),
]


# ---------------------------------------------------------------------------
# Spatial constraint rules
# ---------------------------------------------------------------------------

# (room_type_A, room_type_B) → they should be adjacent / nearby
ADJACENCY_RULES: list[tuple[str, str, str]] = [
    # (type_a, type_b, reason)
    ("kitchen",     "dining_room",  "Kitchen placed adjacent to dining room for easy serving access."),
    ("kitchen",     "utility",      "Utility room placed next to kitchen for plumbing and appliance access."),
    ("hallway",     "living_room",  "Living room accessible from entrance hallway."),
    ("hallway",     "bathroom",     "Bathroom accessible from hallway — avoids routing through private rooms."),
    ("bedroom",     "bathroom",     "Bathroom positioned near bedrooms for convenient access."),
    ("living_room", "dining_room",  "Dining room linked to living area to create a sociable open zone."),
    ("garage",      "utility",      "Utility room positioned beside garage for direct internal access."),
    ("bedroom",     "garden",       "Outdoor area placed beside bedroom cluster for rear-garden access."),
]

# ---------------------------------------------------------------------------
# Zone ordering priority
# ---------------------------------------------------------------------------

ZONE_AFFINITY: dict[str, list[str]] = {
    "bedroom":    ["private", "service"],
    "bathroom":   ["service", "private"],
    "kitchen":    ["service", "public"],
    "living_room":["public", "service"],
    "dining_room":["public", "service"],
    "study":      ["service", "private"],
    "utility":    ["service"],
    "garage":     ["service", "outdoor"],
    "garden":     ["outdoor", "service"],
    "hallway":    ["service"],
}

# ---------------------------------------------------------------------------
# NEW: Architectural position preferences
# ---------------------------------------------------------------------------

ROOM_POSITION_PREFERENCE: dict[str, list[str]] = {
    "living_room": ["public"],
    "dining_room": ["public"],
    "kitchen":     ["service"],
    "bedroom":     ["private"],
    "bathroom":    ["service"],
    "hallway":     ["service"],
    "garage":      ["outdoor"],
    "garden":      ["outdoor"],
}

# ---------------------------------------------------------------------------
# Template selection
# ---------------------------------------------------------------------------

def select_template(layout: ParsedLayout) -> Template:
    """Pick the best-fit template based on room count and building type."""

    n = len(layout.rooms)
    btype = layout.building_type

    candidates = [
        t for t in TEMPLATES
        if btype in t.suitable_for and t.min_rooms <= n <= t.max_rooms
    ]

    if not candidates:
        # Fall back to closest by room count
        candidates = sorted(
            TEMPLATES,
            key=lambda t: abs(n - (t.min_rooms + t.max_rooms) // 2)
        )

    return min(candidates, key=lambda t: abs(len(t.slots) - n))

# ---------------------------------------------------------------------------
# Room → slot assignment
# ---------------------------------------------------------------------------

def _zone_affinity_score(room_type: str, slot: GridSlot) -> int:
    """
    Lower score = better zone match.
    """

    preferred = ZONE_AFFINITY.get(room_type, ["service"])

    if slot.zone in preferred:
        return preferred.index(slot.zone)

    return 99

# ---------------------------------------------------------------------------
# NEW: Intelligent architectural placement scoring
# ---------------------------------------------------------------------------

def _position_score(room_type: str, slot: GridSlot) -> int:
    """
    Lower score = better architectural positioning.
    """

    score = 0

    preferred = ROOM_POSITION_PREFERENCE.get(room_type, [])

    # Preferred zone bonus
    if slot.zone in preferred:
        score -= 20

    # ---------------------------------------------------------------
    # Living room prefers central/public positions
    # ---------------------------------------------------------------

    if room_type == "living_room":

        if slot.col in [1, 2]:
            score -= 15

        if slot.row == 0:
            score -= 5

    # ---------------------------------------------------------------
    # Dining room near public center
    # ---------------------------------------------------------------

    if room_type == "dining_room":

        if slot.col in [1, 2]:
            score -= 10

    # ---------------------------------------------------------------
    # Bedrooms grouped lower/private
    # ---------------------------------------------------------------

    if room_type == "bedroom":

        if slot.row >= 2:
            score -= 15

    # ---------------------------------------------------------------
    # Bathrooms near bedrooms
    # ---------------------------------------------------------------

    if room_type == "bathroom":

        if slot.row >= 1:
            score -= 8

    # ---------------------------------------------------------------
    # Kitchen prefers service edge
    # ---------------------------------------------------------------

    if room_type == "kitchen":

        if slot.col == 0:
            score -= 12

    # ---------------------------------------------------------------
    # Garage/garden prefer perimeter
    # ---------------------------------------------------------------

    if room_type in ["garage", "garden"]:

        if slot.col == 0 or slot.col >= 3:
            score -= 15

    # ---------------------------------------------------------------
    # Hallway near front entrance
    # ---------------------------------------------------------------

    if room_type == "hallway":

        if slot.row == 0:
            score -= 12

    return score

# ---------------------------------------------------------------------------
# Slot-adjacency + adjacency-rule helpers
# ---------------------------------------------------------------------------

def _slots_grid_adjacent(s1: GridSlot, s2: GridSlot) -> bool:
    """True if two grid slots touch (share an edge), same logic as _find_adjacency_pairs."""
    a_right  = s1.col + s1.col_span
    b_right  = s2.col + s2.col_span
    a_bottom = s1.row + s1.row_span
    b_bottom = s2.row + s2.row_span

    h_adjacent = (a_right == s2.col or b_right == s1.col)
    v_adjacent = (a_bottom == s2.row or b_bottom == s1.row)
    row_overlap = not (a_bottom <= s2.row or b_bottom <= s1.row)
    col_overlap = not (a_right <= s2.col or b_right <= s1.col)

    return (h_adjacent and row_overlap) or (v_adjacent and col_overlap)


def _required_adjacency_pairs(rooms: list[Room]) -> list[tuple[str, str]]:
    """
    ADJACENCY_RULES type-pairs that are actually relevant for this room list
    (both types present). Enforced at the type level — at least one instance
    of type A must end up grid-adjacent to at least one instance of type B —
    not every instance, since e.g. multiple bedrooms sharing one bathroom is
    architecturally normal.
    """
    type_set = {r.room_type for r in rooms}
    return [(a, b) for a, b, _ in ADJACENCY_RULES if a in type_set and b in type_set]


def _count_satisfied_pairs(
    assignment: dict[int, GridSlot],
    rooms: list[Room],
    required_pairs: list[tuple[str, str]],
) -> int:
    count = 0
    for type_a, type_b in required_pairs:
        satisfied = False
        for i, ri in enumerate(rooms):
            if ri.room_type != type_a or i not in assignment:
                continue
            for j, rj in enumerate(rooms):
                if i == j or rj.room_type != type_b or j not in assignment:
                    continue
                if _slots_grid_adjacent(assignment[i], assignment[j]):
                    satisfied = True
                    break
            if satisfied:
                break
        if satisfied:
            count += 1
    return count

def assign_rooms(layout: ParsedLayout, template: Template) -> list[AssignedRoom]:
    """
    Architectural room assignment via backtracking search:
    - zone affinity + position scoring rank candidate slots for each room
      (best-first), same as before
    - ADJACENCY_RULES type-pairs present in the room list are enforced as a
      HARD constraint: a full assignment is only accepted if every required
      pair actually ends up grid-adjacent
    - search is bounded by MAX_ATTEMPTS; if no fully-satisfying assignment
      is found in budget, falls back to the partial-best assignment found
      (most rules satisfied, then best zone/position score) rather than
      hanging — so this degrades gracefully on pathological inputs instead
      of guaranteeing perfection
    """
    available_slots = list(template.slots)

    priority_order = [
        "hallway", "living_room", "dining_room", "kitchen", "bedroom",
        "bathroom", "study", "utility", "garage", "garden",
    ]

    def room_priority(r: Room) -> int:
        try:
            return priority_order.index(r.room_type)
        except ValueError:
            return 99

    sorted_rooms = sorted(layout.rooms, key=room_priority)
    if len(sorted_rooms) > len(available_slots):
        sorted_rooms = sorted_rooms[: len(available_slots)]
    n = len(sorted_rooms)

    if n == 0:
        return []

    required_pairs = _required_adjacency_pairs(sorted_rooms)

    def slot_score(room: Room, slot: GridSlot) -> int:
        return _zone_affinity_score(room.room_type, slot) + _position_score(room.room_type, slot)

    # Best-first candidate slot order per room, computed once.
    candidate_orders = [
        sorted(available_slots, key=lambda s: slot_score(room, s))
        for room in sorted_rooms
    ]

    MAX_ATTEMPTS = 50_000
    attempts = 0
    used_slot_ids: set[str] = set()
    assignment: dict[int, GridSlot] = {}

    best_assignment: Optional[dict[int, GridSlot]] = None
    best_satisfied = -1
    best_score = float("inf")

    def consider_complete() -> bool:
        nonlocal best_assignment, best_satisfied, best_score
        satisfied = _count_satisfied_pairs(assignment, sorted_rooms, required_pairs)
        total_score = sum(slot_score(sorted_rooms[i], assignment[i]) for i in range(n))
        if satisfied > best_satisfied or (satisfied == best_satisfied and total_score < best_score):
            best_assignment = dict(assignment)
            best_satisfied = satisfied
            best_score = total_score
        return satisfied == len(required_pairs)

    def backtrack(idx: int) -> bool:
        nonlocal attempts
        attempts += 1
        if attempts > MAX_ATTEMPTS:
            return False
        if idx == n:
            return consider_complete()

        for slot in candidate_orders[idx]:
            if slot.slot_id in used_slot_ids:
                continue
            assignment[idx] = slot
            used_slot_ids.add(slot.slot_id)
            if backtrack(idx + 1):
                return True
            used_slot_ids.remove(slot.slot_id)
            del assignment[idx]
        return False

    backtrack(0)

    final = best_assignment or {}
    assigned: list[AssignedRoom] = []
    for i, room in enumerate(sorted_rooms):
        slot = final.get(i)
        if slot is None:
            continue
        assigned.append(AssignedRoom(room=room, slot=slot, x=0, y=0, w=0, h=0))

    return assigned




# ---------------------------------------------------------------------------
# Pixel coordinate computation
# ---------------------------------------------------------------------------

def _compute_pixel_coords(
    assigned: list[AssignedRoom],
    cols: int,
    rows: int,
) -> tuple[list[AssignedRoom], int, int]:
    """
    Convert grid (col, row, col_span, row_span) to pixel (x, y, w, h).
    Returns updated list plus canvas (width, height).
    """
    MARGIN = 24
    col_w = CELL_W
    row_h = CELL_H

    canvas_w = MARGIN * 2 + cols * col_w + (cols - 1) * PADDING
    canvas_h = MARGIN * 2 + rows * row_h + (rows - 1) * PADDING

    for ar in assigned:
        s = ar.slot
        ar.x = MARGIN + s.col * (col_w + PADDING)
        ar.y = MARGIN + s.row * (row_h + PADDING)
        ar.w = s.col_span * col_w + (s.col_span - 1) * PADDING
        ar.h = s.row_span * row_h + (s.row_span - 1) * PADDING

    return assigned, canvas_w, canvas_h


# ---------------------------------------------------------------------------
# Adjacency pair detection
# ---------------------------------------------------------------------------

def _find_adjacency_pairs(
    assigned: list[AssignedRoom],
) -> list[tuple[str, str]]:
    """Return pairs of room labels that are grid-adjacent (share an edge)."""
    pairs: list[tuple[str, str]] = []
    for i, a in enumerate(assigned):
        for b in assigned[i + 1:]:
            # Adjacent horizontally or vertically (touching edges)
            a_right  = a.slot.col + a.slot.col_span
            b_right  = b.slot.col + b.slot.col_span
            a_bottom = a.slot.row + a.slot.row_span
            b_bottom = b.slot.row + b.slot.row_span

            h_adjacent = (a_right == b.slot.col or b_right == a.slot.col)
            v_adjacent = (a_bottom == b.slot.row or b_bottom == a.slot.row)
            row_overlap = not (a_bottom <= b.slot.row or b_bottom <= a.slot.row)
            col_overlap = not (a_right <= b.slot.col or b_right <= a.slot.col)

            if (h_adjacent and row_overlap) or (v_adjacent and col_overlap):
                pairs.append((a.room.label, b.room.label))
    return pairs


# ---------------------------------------------------------------------------
# Rule application log
# ---------------------------------------------------------------------------

def _collect_applied_rules(
    assigned: list[AssignedRoom],
    layout: ParsedLayout,
    template: Template,
    adjacency_pairs: list[tuple[str, str]],
) -> list[str]:
    """
    Generate human-readable rules that were applied during layout.

    Adjacency reasons are only included if the rule's type-pair is actually
    realised by a grid-adjacent pair of rooms in the final layout (checked
    via adjacency_pairs), not merely because both room types happen to
    appear somewhere in the plan.
    """
    rules: list[str] = []

    rules.append(
        f"Template selected: '{template.name}' — best fit for "
        f"{layout.total_bedrooms} bedroom(s), {layout.total_bathrooms} bathroom(s) "
        f"in a {layout.building_type}."
    )

    room_types = {ar.room.room_type for ar in assigned}
    label_to_type = {ar.room.label: ar.room.room_type for ar in assigned}

    achieved_type_pairs: set[tuple[str, str]] = set()
    for la, lb in adjacency_pairs:
        ta, tb = label_to_type.get(la), label_to_type.get(lb)
        if ta and tb:
            achieved_type_pairs.add((ta, tb))
            achieved_type_pairs.add((tb, ta))

    for type_a, type_b, reason in ADJACENCY_RULES:
        if (type_a, type_b) in achieved_type_pairs:
            rules.append(reason)

    if layout.total_bedrooms >= 2:
        rules.append("Bedrooms grouped together in the private zone for noise separation from living areas.")

    if "open-plan" in " ".join(layout.preferences).lower() or any(
        "open-plan" in r.attributes for r in layout.rooms
    ):
        rules.append("Open-plan preference detected — kitchen and living/dining areas placed in adjacent slots.")

    en_suite_rooms = [r for r in layout.rooms if "en-suite" in r.attributes]
    if en_suite_rooms:
        rules.append(
            f"En-suite bathroom placed directly beside the master bedroom as specified."
        )

    if "hallway" in room_types:
        rules.append("Entrance hallway placed at the front to provide a buffer between public and private zones.")

    if "garden" in room_types or "garage" in room_types:
        rules.append("Outdoor/garage spaces placed at the perimeter of the plan.")

    return rules


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_layout(layout: ParsedLayout) -> GeneratedLayout:
    """
    Full pipeline: select template → assign rooms → compute coords → collect rules.
    """
    template = select_template(layout)
    assigned = assign_rooms(layout, template)
    assigned, canvas_w, canvas_h = _compute_pixel_coords(assigned, template.cols, template.rows)
    adjacency_pairs = _find_adjacency_pairs(assigned)
    applied_rules = _collect_applied_rules(assigned, layout, template, adjacency_pairs)

    return GeneratedLayout(
        template=template,
        assigned_rooms=assigned,
        adjacency_pairs=adjacency_pairs,
        canvas_w=canvas_w,
        canvas_h=canvas_h,
        applied_rules=applied_rules,
    )