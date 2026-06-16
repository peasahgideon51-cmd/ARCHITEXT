"""
parser.py — Architext NLP parser
Extracts room types, counts, and spatial preferences from plain-English text.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Room:
    room_type: str          # canonical type, e.g. "bedroom"
    label: str              # display label, e.g. "Master Bedroom"
    count: int = 1
    attributes: list[str] = field(default_factory=list)   # e.g. ["en-suite", "open-plan"]
    adjacency_hints: list[str] = field(default_factory=list)  # e.g. ["kitchen"]


@dataclass
class ParsedLayout:
    rooms: list[Room]
    building_type: str          # e.g. "house", "apartment", "studio"
    total_bedrooms: int
    total_bathrooms: int
    preferences: list[str]      # free-text spatial preferences found
    raw_input: str


# ---------------------------------------------------------------------------
# Room vocabulary
# ---------------------------------------------------------------------------

# Maps keywords → canonical room type
ROOM_ALIASES: dict[str, str] = {
    # Bedrooms
    "bedroom": "bedroom", "bed room": "bedroom", "bedrooms": "bedroom",
    "master bedroom": "bedroom", "master bed": "bedroom",
    "guest bedroom": "bedroom", "guest room": "bedroom",
    "double bedroom": "bedroom", "single bedroom": "bedroom",

    # Bathrooms
    "bathroom": "bathroom", "bathrooms": "bathroom",
    "bath": "bathroom", "en-suite": "bathroom", "ensuite": "bathroom",
    "en suite": "bathroom", "shower room": "bathroom",
    "wc": "bathroom", "toilet": "bathroom", "half bath": "bathroom",
    "powder room": "bathroom",

    # Kitchen
    "kitchen": "kitchen", "kitchenette": "kitchen",
    "open kitchen": "kitchen", "open-plan kitchen": "kitchen",

    # Living
    "living room": "living_room", "living": "living_room",
    "lounge": "living_room", "sitting room": "living_room",
    "reception room": "living_room", "family room": "living_room",

    # Dining
    "dining room": "dining_room", "dining": "dining_room",
    "dining area": "dining_room", "breakfast room": "dining_room",

    # Study
    "study": "study", "office": "study", "home office": "study",
    "work room": "study",

    # Utility
    "utility room": "utility", "utility": "utility",
    "laundry room": "utility", "laundry": "utility",
    "boot room": "utility",

    # Garage
    "garage": "garage", "double garage": "garage",
    "single garage": "garage", "car port": "garage",

    # Outdoor
    "garden": "garden", "patio": "garden", "terrace": "garden",
    "balcony": "garden", "courtyard": "garden",

    # Hallway
    "hallway": "hallway", "hall": "hallway", "entrance": "hallway",
    "foyer": "hallway", "corridor": "hallway", "landing": "hallway",
}

# Display labels for canonical types
ROOM_LABELS: dict[str, str] = {
    "bedroom": "Bedroom",
    "bathroom": "Bathroom",
    "kitchen": "Kitchen",
    "living_room": "Living Room",
    "dining_room": "Dining Room",
    "study": "Study",
    "utility": "Utility Room",
    "garage": "Garage",
    "garden": "Garden / Patio",
    "hallway": "Hallway",
}

# Special prefixes that modify bedroom labels
SPECIAL_BEDROOM_PREFIXES = ["master", "guest", "double", "single"]

# Number words → integer
NUMBER_WORDS: dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "a": 1, "an": 1,
}

# Building type keywords
BUILDING_TYPES = {
    "house": "house", "home": "house", "bungalow": "house", "villa": "house",
    "apartment": "apartment", "flat": "apartment", "maisonette": "apartment",
    "studio": "studio", "studio flat": "studio",
}

# Spatial preference keywords to capture
PREFERENCE_KEYWORDS = [
    "open.plan", "open plan", "open-plan",
    "adjacent", "next to", "near", "beside", "connected to",
    "en.suite", "ensuite", "en suite",
    "separate", "shared",
    "north", "south", "east", "west",
    "corner", "front", "rear", "back",
    "ground floor", "first floor", "upper",
]


# ---------------------------------------------------------------------------
# Core parser
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    """Lower-case and collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


def _extract_number(preceding: str) -> int:
    """Try to extract a count from the words immediately before a room name."""
    # Handle hyphenated patterns like "3-bedroom" or "three-bedroom"
    m = re.search(r"(\d+|one|two|three|four|five|six|seven|eight)-\s*$", preceding.strip())
    if m:
        tok = m.group(1)
        if tok.isdigit():
            return int(tok)
        if tok in NUMBER_WORDS:
            return NUMBER_WORDS[tok]

    # Look for a digit or number word in the last ~3 tokens
    tokens = preceding.strip().split()[-3:]
    for tok in reversed(tokens):
        tok = tok.strip(".,;:()-")
        if tok.isdigit():
            return int(tok)
        if tok in NUMBER_WORDS:
            return NUMBER_WORDS[tok]
    return 1


def _detect_building_type(text: str) -> str:
    norm = _normalise(text)
    for kw, btype in BUILDING_TYPES.items():
        if kw in norm:
            return btype
    return "house"  # sensible default


def _detect_preferences(text: str) -> list[str]:
    norm = _normalise(text)
    found = []
    for kw in PREFERENCE_KEYWORDS:
        pattern = kw.replace(".", r"\s*")
        if re.search(pattern, norm):
            # Capture a small snippet of context
            m = re.search(r".{0,25}" + pattern + r".{0,25}", norm)
            if m:
                found.append(m.group(0).strip())
    return list(dict.fromkeys(found))  # deduplicate preserving order


def _make_bedroom_label(prefix: str, index: int, total: int) -> str:
    """Return a nice label for a bedroom, e.g. 'Master Bedroom', 'Bedroom 2'."""
    if prefix in ("master",):
        return "Master Bedroom"
    if prefix in ("guest",):
        return "Guest Bedroom"
    if total == 1:
        return "Bedroom"
    return f"Bedroom {index + 1}"


def _make_bathroom_label(attributes: list[str], index: int, total: int) -> str:
    if "en-suite" in attributes or "ensuite" in attributes:
        return "En-suite"
    if total == 1:
        return "Bathroom"
    return f"Bathroom {index + 1}"


def parse(text: str) -> ParsedLayout:
    """
    Main entry point.  Parse a natural-language building description and return
    a structured ParsedLayout.
    """
    norm = _normalise(text)
    building_type = _detect_building_type(text)
    preferences = _detect_preferences(text)

    # We'll accumulate rooms keyed by canonical type, then expand multiples
    room_groups: dict[str, dict] = {}  # type → {count, attributes, prefix}

    # Sort aliases longest-first so multi-word phrases match before substrings
    sorted_aliases = sorted(ROOM_ALIASES.keys(), key=len, reverse=True)

    # Track what spans we've already consumed (to avoid double-counting)
    consumed: list[tuple[int, int]] = []

    def already_consumed(start: int, end: int) -> bool:
        return any(s <= start < e or s < end <= e for s, e in consumed)

    for alias in sorted_aliases:
        pattern = re.escape(alias)
        for m in re.finditer(pattern, norm):
            start, end = m.start(), m.end()
            if already_consumed(start, end):
                continue
            consumed.append((start, end))

            canonical = ROOM_ALIASES[alias]
            count = _extract_number(norm[:start])

            # Detect prefix (master, guest…) for bedrooms
            prefix = ""
            if canonical == "bedroom":
                words_before = norm[max(0, start - 20):start].split()
                for w in reversed(words_before):
                    w = w.strip(".,;:()")
                    if w in SPECIAL_BEDROOM_PREFIXES:
                        prefix = w
                        break

            # Detect en-suite attribute
            attributes: list[str] = []
            if alias in ("en-suite", "ensuite", "en suite"):
                attributes.append("en-suite")
            if "open" in norm[max(0, start - 15):start]:
                attributes.append("open-plan")

            if canonical not in room_groups:
                room_groups[canonical] = {"count": count, "attributes": attributes, "prefix": prefix}
            else:
                # Accumulate counts for the same type (e.g. "3 bedrooms … master bedroom")
                # Always take the maximum explicitly stated count
                existing = room_groups[canonical]["count"]
                room_groups[canonical]["count"] = max(existing, count)
                room_groups[canonical]["attributes"] += [
                    a for a in attributes if a not in room_groups[canonical]["attributes"]
                ]

    # If en-suite was mentioned, it's a bathroom — ensure bathroom count reflects it
    if "bathroom" in room_groups and any(
        "en-suite" in room_groups.get(t, {}).get("attributes", [])
        for t in room_groups
    ):
        # en-suite is already counted under bathroom; fine
        pass

    # Auto-inject hallway for multi-room buildings
    if len(room_groups) >= 3 and "hallway" not in room_groups and building_type != "studio":
        room_groups["hallway"] = {"count": 1, "attributes": [], "prefix": ""}

    # Expand grouped rooms into individual Room objects
    rooms: list[Room] = []
    bedroom_count = 0
    bathroom_count = 0

    for canonical, info in room_groups.items():
        count = max(1, info["count"])
        attrs = info["attributes"]
        prefix = info.get("prefix", "")

        if canonical == "bedroom":
            for i in range(count):
                label = _make_bedroom_label(prefix if i == 0 else "", i, count)
                rooms.append(Room(
                    room_type=canonical,
                    label=label,
                    count=1,
                    attributes=list(attrs),
                    adjacency_hints=["bathroom"] if "en-suite" in attrs else [],
                ))
                bedroom_count += 1

        elif canonical == "bathroom":
            for i in range(count):
                label = _make_bathroom_label(attrs, i, count)
                rooms.append(Room(
                    room_type=canonical,
                    label=label,
                    count=1,
                    attributes=list(attrs),
                    adjacency_hints=["hallway", "bedroom"],
                ))
                bathroom_count += 1

        else:
            label = ROOM_LABELS.get(canonical, canonical.replace("_", " ").title())
            rooms.append(Room(
                room_type=canonical,
                label=label,
                count=count,
                attributes=list(attrs),
            ))

    return ParsedLayout(
        rooms=rooms,
        building_type=building_type,
        total_bedrooms=bedroom_count,
        total_bathrooms=bathroom_count,
        preferences=preferences,
        raw_input=text,
    )