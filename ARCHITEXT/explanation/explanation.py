"""
explanation.py — Architext explanation module

Takes the applied rules and layout metadata and produces a structured,
plain-English explanation log for display to the user.
"""

from __future__ import annotations
from parser.parser import ParsedLayout
from layout.layout_engine import GeneratedLayout


def generate_explanation(
    parsed: ParsedLayout,
    layout: GeneratedLayout,
) -> list[str]:
    """
    Return a list of plain-English explanation strings.

    Each string describes one layout decision made by Architext.
    The list is ordered from high-level (template choice) to detail (room rules).
    """
    log: list[str] = []

    # 1. Input summary
    room_names = [r.label for r in parsed.rooms]
    rooms_str = ", ".join(room_names[:-1]) + (" and " + room_names[-1] if len(room_names) > 1 else room_names[0] if room_names else "")
    log.append(
        f"Input parsed: detected {len(parsed.rooms)} room(s) — {rooms_str} — "
        f"in a {parsed.building_type}."
    )

    # 2. Template selection
    log.append(
        f"Template '{layout.template.name}' selected: "
        f"best match for {parsed.total_bedrooms} bedroom(s) and "
        f"{parsed.total_bathrooms} bathroom(s)."
    )

    # 3. Rules applied by the layout engine (already collected)
    for rule in layout.applied_rules[2:]:   # skip the template line (already covered above)
        log.append(rule)

    # 4. Adjacency summary
    if layout.adjacency_pairs:
        pair_str = "; ".join(f"{a} ↔ {b}" for a, b in layout.adjacency_pairs[:4])
        extra = f" (+{len(layout.adjacency_pairs) - 4} more)" if len(layout.adjacency_pairs) > 4 else ""
        log.append(f"Grid adjacencies enforced: {pair_str}{extra}.")

    # 5. Preferences detected
    if parsed.preferences:
        pref_str = ", ".join(f'"{p}"' for p in parsed.preferences[:3])
        log.append(f"Spatial preferences detected in input: {pref_str}.")

    return log