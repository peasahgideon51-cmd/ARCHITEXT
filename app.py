"""
app.py — Architext Flask API server

Routes:
  POST /api/parse/input      Accepts raw text; returns structured room data
  POST /api/layout/generate  Takes parsed data; returns SVG + explanation
  GET  /api/layout/templates Returns available base templates
  GET  /                     Serves the frontend HTML
"""

from __future__ import annotations
import json
from dataclasses import asdict
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS

from parser.parser import parse, ParsedLayout
from layout.layout_engine import generate_layout, TEMPLATES
from renderer.renderer import render_svg, ROOM_COLOURS, DEFAULT_COLOURS # 
from explanation.explanation import generate_explanation

app = Flask(__name__, static_folder="static")
CORS(app)   # allow the frontend to call the API from any origin during development


# ---------------------------------------------------------------------------
# Helper: serialise a ParsedLayout to a JSON-safe dict
# ---------------------------------------------------------------------------

def _serialise_parsed(parsed: ParsedLayout) -> dict:
    return {
        "building_type": parsed.building_type,
        "total_bedrooms": parsed.total_bedrooms,
        "total_bathrooms": parsed.total_bathrooms,
        "preferences": parsed.preferences,
        "rooms": [
            {
                "room_type": r.room_type,
                "label": r.label,
                "count": r.count,
                "attributes": r.attributes,
                "adjacency_hints": r.adjacency_hints,
            }
            for r in parsed.rooms
        ],
    }


# ---------------------------------------------------------------------------
# POST /api/parse/input
# ---------------------------------------------------------------------------

@app.post("/api/parse/input")
def api_parse_input():
    """
    Body (JSON): { "text": "3-bedroom house with open kitchen …" }

    Returns structured room data extracted from the description.
    """
    body = request.get_json(silent=True)
    if not body or not body.get("text"):
        abort(400, description="Request body must be JSON with a non-empty 'text' field.")

    text: str = body["text"].strip()
    if len(text) > 2000:
        abort(400, description="Input text must be 2000 characters or fewer.")

    parsed = parse(text)
    return jsonify({
        "ok": True,
        "parsed": _serialise_parsed(parsed),
    })


# ---------------------------------------------------------------------------
# POST /api/layout/generate
# ---------------------------------------------------------------------------

@app.post("/api/layout/generate")
def api_layout_generate():
    """
    Body (JSON):
      {
        "text": "raw description"          ← preferred (parses internally)
        OR
        "parsed": { … }                    ← pre-parsed payload from /api/parse/input
      }

    Returns:
      {
        "ok": true,
        "plan": {
          "title": "3-Bedroom House",
          "template": "house_3bed",
          "rooms": [ { "label", "room_type", "x", "y", "w", "h", "color" } ],
          "adjacencies": [ ["Living Room", "Kitchen"], … ],
          "explanation": [ "…", "…" ],
          "svg": "<svg>…</svg>",
          "canvas": { "w": 728, "h": 408 }
        }
      }
    """
    body = request.get_json(silent=True)
    if not body:
        abort(400, description="Request body must be JSON.")

    # Accept either raw text or a pre-parsed payload
    if "text" in body:
        text = body["text"].strip()
        if not text:
            abort(400, description="'text' field must not be empty.")
        parsed = parse(text)
    elif "parsed" in body:
        # Re-hydrate from dict — basic validation only
        p = body["parsed"]
        parsed = parse(p.get("raw_input", "") or " ".join(
            r.get("label", "") for r in p.get("rooms", [])
        ))
    else:
        abort(400, description="Provide either 'text' or 'parsed' in the request body.")

    layout = generate_layout(parsed)
    explanation = generate_explanation(parsed, layout)

    
    rooms_out = [
        {
            "label": ar.room.label,
            "room_type": ar.room.room_type,
            "x": ar.x,
            "y": ar.y,
            "w": ar.w,
            "h": ar.h,
            "color": ROOM_COLOURS.get(ar.room.room_type, DEFAULT_COLOURS)[0],
            "attributes": ar.room.attributes,
        }
        for ar in layout.assigned_rooms
    ]

    if isinstance(parsed.preferences, dict):
         unit_pref = parsed.preferences.get("units", "metric")
    else:
        unit_pref = "metric"
        svg = render_svg(layout, title=layout.template.name, units=unit_pref)

    return jsonify({
        "ok": True,
        "plan": {
            "title": layout.template.name,
            "template": layout.template.template_id,
            "rooms": rooms_out,
            "adjacencies": [list(p) for p in layout.adjacency_pairs],
            "explanation": explanation,
            "svg": render_svg(layout, title=layout.template.name, units=unit_pref),
            "canvas": {"w": layout.canvas_w, "h": layout.canvas_h},
        },
    })


# ---------------------------------------------------------------------------
# GET /api/layout/templates
# ---------------------------------------------------------------------------

@app.get("/api/layout/templates")
def api_layout_templates():
    """Returns the full list of available base templates."""
    return jsonify({
        "ok": True,
        "templates": [
            {
                "template_id": t.template_id,
                "name": t.name,
                "cols": t.cols,
                "rows": t.rows,
                "suitable_for": t.suitable_for,
                "min_rooms": t.min_rooms,
                "max_rooms": t.max_rooms,
                "slot_count": len(t.slots),
            }
            for t in TEMPLATES
        ],
    })


# ---------------------------------------------------------------------------
# Static frontend (optional — place index.html in ./static/)
# ---------------------------------------------------------------------------

@app.get("/")
def serve_index():
    return send_from_directory("static", "index.html")


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"ok": False, "error": str(e.description)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"ok": False, "error": "Endpoint not found."}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"ok": False, "error": "Internal server error."}), 500


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)