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
# Authentication & Database Setup
# ---------------------------------------------------------------------------

# Import the database object and User model we created in models.py
from models import db, User

# Bcrypt is used to securely hash passwords (never store plain text passwords!)
from flask_bcrypt import Bcrypt

# Flask-Login handles user sessions (keeping users logged in, logging out, etc.)
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

# Tell Flask where to store the database — this creates a file called architext.db
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///architext.db"

# SECRET_KEY is used to keep login sessions secure (we'll improve this later with a real secret)
app.config["SECRET_KEY"] = "change-this-later-to-something-random"

# Connect our database object (from models.py) to this Flask app
db.init_app(app)

# Set up bcrypt so we can hash and check passwords
bcrypt = Bcrypt(app)

# Set up Flask-Login to manage logged-in users
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "api_login"  # type: ignore

# Create the database tables (if they don't already exist) when the app starts
with app.app_context():
    db.create_all()


# Tells Flask-Login how to find a user by their ID (used to keep sessions working)
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ---------------------------------------------------------------------------
# POST /api/auth/signup
# ---------------------------------------------------------------------------

@app.post("/api/auth/signup")
def api_signup():
    """
    Body (JSON): { "email": "user@example.com", "password": "somepassword" }

    Creates a new user account. Returns an error if the email is already taken.
    """
    body = request.get_json(silent=True)

    if not body or not body.get("email") or not body.get("password"):
        abort(400, description="Request body must include 'email' and 'password'.")

    email = body["email"].strip().lower()
    password = body["password"]

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        abort(400, description="An account with this email already exists.")

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    new_user = User(email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    login_user(new_user)

    return jsonify({
        "ok": True,
        "message": "Account created successfully.",
        "user": {"id": new_user.id, "email": new_user.email},
    })


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------

@app.post("/api/auth/login")
def api_login():
    """
    Body (JSON): { "email": "user@example.com", "password": "somepassword" }

    Logs an existing user in if the email and password match.
    """
    body = request.get_json(silent=True)

    if not body or not body.get("email") or not body.get("password"):
        abort(400, description="Request body must include 'email' and 'password'.")

    email = body["email"].strip().lower()
    password = body["password"]

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        abort(401, description="Invalid email or password.")

    login_user(user)

    return jsonify({
        "ok": True,
        "message": "Logged in successfully.",
        "user": {"id": user.id, "email": user.email},
    })


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

@app.post("/api/auth/logout")
@login_required
def api_logout():
    """Logs the current user out (ends their session)."""
    logout_user()
    return jsonify({"ok": True, "message": "Logged out successfully."})

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
                "svg": svg,
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

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"ok": False, "error": str(e.description)}), 401

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
    app.run(debug=True, port=5000, host='0.0.0.0')