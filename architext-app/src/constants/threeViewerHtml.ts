// Auto-generated from three_viewer_v2.html
export const THREE_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
<title>Architext 3D</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #f5f0e8; overflow: hidden; }
  #canvas { width: 100%; height: 100%; display: block; }

  #ui {
    position: absolute; top: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px;
    background: linear-gradient(to bottom, rgba(245,240,232,0.95) 0%, transparent 100%);
    pointer-events: none;
  }
  #title {
    font-family: 'Georgia', serif;
    font-size: 11px; font-weight: 400; letter-spacing: 2.5px;
    color: #6b5a42; text-transform: uppercase;
  }
  #close-btn {
    pointer-events: all;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(107,90,66,0.12); border: 1px solid rgba(107,90,66,0.2);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: #6b5a42; font-size: 14px; line-height: 1;
  }
  #close-btn:active { background: rgba(107,90,66,0.22); }

  #camera-btns {
    position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 8px;
  }
  .cam-btn {
    font-family: 'Georgia', serif;
    font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase;
    color: #6b5a42;
    background: rgba(245,240,232,0.85);
    border: 1px solid rgba(107,90,66,0.25);
    border-radius: 100px; padding: 8px 18px; cursor: pointer;
  }
  .cam-btn.active {
    background: #6b5a42;
    border-color: #6b5a42;
    color: #f5f0e8;
  }

  #loading {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #f5f0e8; gap: 14px;
  }
  #loading-text {
    font-family: 'Georgia', serif; font-size: 12px; letter-spacing: 2px;
    color: #9b8a72; text-transform: uppercase;
  }
  .spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid rgba(107,90,66,0.15);
    border-top-color: #6b5a42;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  #mode-label {
    position: absolute; top: 52px; left: 50%; transform: translateX(-50%);
    font-family: 'Georgia', serif; font-size: 9px; letter-spacing: 2px;
    color: rgba(107,90,66,0.5); text-transform: uppercase; white-space: nowrap;
    pointer-events: none;
  }
</style>
</head>
<body>

<canvas id="canvas"></canvas>

<div id="loading">
  <div class="spinner"></div>
  <div id="loading-text">Building 3D model…</div>
</div>

<div id="ui">
  <div id="title">3D View</div>
  <button id="close-btn" onclick="sendClose()">✕</button>
</div>
<div id="mode-label" id="mode-label">Dollhouse View</div>

<div id="camera-btns">
  <button class="cam-btn active" id="btn-overview" onclick="setCam('overview')">Overview</button>
  <button class="cam-btn" id="btn-eyelevel" onclick="setCam('eyelevel')">Eye Level</button>
  <button class="cam-btn" id="btn-top" onclick="setCam('top')">Top</button>
</div>

<script>
  // Surface any failure directly in the loading UI — there's no console
  // access on-device, so a silent console.error just looks like a hang.
  function showLoadError(msg) {
    var el = document.getElementById('loading-text');
    var sp = document.querySelector('.spinner');
    if (el) { el.textContent = msg; el.style.color = '#b85c5c'; }
    if (sp) sp.style.display = 'none';
  }
  window.onerror = function(msg) { showLoadError('Error: ' + msg); return false; };
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" onerror="showLoadError('Could not load the 3D engine — check your internet connection')"></script>
<script>
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PX_TO_M   = 1 / 100;   // layout px → metres
const WALL_EXT  = 0.22;       // exterior wall thickness (m)
const WALL_INT  = 0.12;       // interior partition thickness (m)
const DOOR_W    = 0.90;
const DOOR_H    = 2.10;
const WIN_W     = 1.10;
const WIN_H     = 0.95;
const WIN_SILL  = 0.85;
const CUTAWAY_H = 1.30;       // dollhouse wall height in overview/top mode
const FULL_H    = 999;        // sentinel = use actual room ceiling height

// Edge-matching tolerance for shared-wall geometry, in metres. The Flask
// layout engine inserts a 16px gap between every grid cell (PADDING in
// layout_engine.py), which converts to 0.16m here (PX_TO_M = 1/100). This
// must stay comfortably above that gap or genuinely touching rooms will
// never be recognised as sharing a wall. Which pairs count as "shared" at
// all is decided by the authoritative adjacencies list from the layout
// engine (see buildSharedEdges) — this tolerance only resolves the wall's
// exact position once a pair is already confirmed adjacent.
const EDGE_TOL  = 0.20;

const CEILING_HEIGHTS = {
  living_room: 2.7, dining_room: 2.7,
  kitchen: 2.4,     bedroom: 2.4,
  bathroom: 2.2,    hallway: 2.5,
  study: 2.4,       utility: 2.2,
  garage: 2.8,      garden: 0,
};

// Floor colours
const FLOOR_COLS = {
  living_room:  0xc9a97e,
  dining_room:  0xc9a97e,
  bedroom:      0xd6bc9a,
  kitchen:      0xe8e2d8,
  bathroom:     0xcfe0e8,
  hallway:      0xd4ccc0,
  study:        0xc9a97e,
  utility:      0xdad5cc,
  garage:       0xb8b4ac,
  garden:       0x8ec46a,
};
const FLOOR_DEFAULT = 0xd4c8b8;

// Wall colours
const WALL_EXT_COL = 0xe8ddd0;   // warm plaster exterior
const WALL_INT_COL = 0xf2ede6;   // lighter interior partition
const CEIL_COL     = 0xfaf8f5;
const COL_COL      = 0x4a3f30;   // dark structural column
const SKIRTING_COL = 0xddd5c8;

// ---------------------------------------------------------------------------
// Scene state
// ---------------------------------------------------------------------------
let scene, camera, renderer;
let sceneCenter = new THREE.Vector3();
let sceneDiag   = 10;
let currentCam  = 'overview';
let wallMeshes  = [];          // all wall meshes — toggled for eye-level
let animId;

// ---------------------------------------------------------------------------
// Materials (created once)
// ---------------------------------------------------------------------------
let MAT;
function initMaterials() {
  MAT = {
    wallExt:  new THREE.MeshLambertMaterial({ color: WALL_EXT_COL }),
    wallInt:  new THREE.MeshLambertMaterial({ color: WALL_INT_COL }),
    ceil:     new THREE.MeshLambertMaterial({ color: CEIL_COL, side: THREE.FrontSide }),
    col:      new THREE.MeshLambertMaterial({ color: COL_COL }),
    skirting: new THREE.MeshLambertMaterial({ color: SKIRTING_COL }),
    glass:    new THREE.MeshLambertMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    door:     new THREE.MeshLambertMaterial({ color: 0x8b6f4e }),
    doorLeaf: new THREE.MeshLambertMaterial({ color: 0x7a6040 }),
    ground:   new THREE.MeshLambertMaterial({ color: 0xe0d8cc }),
    floorMats: {},
  };
  Object.entries(FLOOR_COLS).forEach(([k, c]) => {
    MAT.floorMats[k] = new THREE.MeshLambertMaterial({ color: c });
  });
  MAT.floorDefault = new THREE.MeshLambertMaterial({ color: FLOOR_DEFAULT });
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function box(w, h, d, mat, cx, cy, cz, parent) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Wall segment with a rectangular opening (door or window)
// Returns a Group. All geometry is centred on the group's local origin.
function wallSegment(length, wallH, thick, openX, openW, openH, openYBase, mat) {
  const g = new THREE.Group();
  const halfL = length / 2;

  function addBox(w, h, d, lx, ly) {
    if (w < 0.01 || h < 0.01) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(-halfL + lx + w / 2, -wallH / 2 + ly + h / 2, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    wallMeshes.push(m);
  }

  if (openW <= 0 || openW >= length - 0.05) {
    // Solid wall
    const m = new THREE.Mesh(new THREE.BoxGeometry(length, wallH, thick), mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    wallMeshes.push(m);
    return g;
  }

  const leftW  = openX;
  const rightW = length - openX - openW;
  const headH  = wallH - (openYBase + openH);

  addBox(leftW,  wallH,              thick, 0,                    0);
  addBox(rightW, wallH,              thick, openX + openW,        0);
  addBox(openW,  openYBase,          thick, openX,                0);        // sill/base
  if (headH > 0.01)
    addBox(openW, headH,             thick, openX, openYBase + openH);       // header

  return g;
}

// Place a wall group at position with optional Y rotation
function placeWall(g, x, y, z, ry) {
  g.position.set(x, y, z);
  if (ry) g.rotation.y = ry;
  scene.add(g);
}

// ---------------------------------------------------------------------------
// Adjacency / shared-edge helpers
// ---------------------------------------------------------------------------
function rangeOverlap(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function buildSharedEdges(rects, adjacencyPairs) {
  const edges = [];
  // Authoritative gate: only pairs the layout engine actually placed
  // grid-adjacent are eligible to be treated as a shared wall. Geometry
  // below only resolves *where* that wall sits, never *whether* it exists.
  const adjSet = new Set(
    (adjacencyPairs || []).map(([a, b]) => [a, b].sort().join('|'))
  );

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (!adjSet.has([a.label, b.label].sort().join('|'))) continue;

      // Vertical shared wall
      if (Math.abs(a.x2 - b.x1) < EDGE_TOL) {
        const ov = rangeOverlap(a.y1, a.y2, b.y1, b.y2);
        if (ov > 0.2) edges.push({ axis: 'v', coord: a.x2, span0: Math.max(a.y1,b.y1), span1: Math.min(a.y2,b.y2), ra: a, rb: b });
      }
      if (Math.abs(b.x2 - a.x1) < EDGE_TOL) {
        const ov = rangeOverlap(a.y1, a.y2, b.y1, b.y2);
        if (ov > 0.2) edges.push({ axis: 'v', coord: a.x1, span0: Math.max(a.y1,b.y1), span1: Math.min(a.y2,b.y2), ra: b, rb: a });
      }
      // Horizontal shared wall (both directions — a above b, or b above a)
      if (Math.abs(a.y2 - b.y1) < EDGE_TOL) {
        const ov = rangeOverlap(a.x1, a.x2, b.x1, b.x2);
        if (ov > 0.2) edges.push({ axis: 'h', coord: a.y2, span0: Math.max(a.x1,b.x1), span1: Math.min(a.x2,b.x2), ra: a, rb: b });
      }
      if (Math.abs(b.y2 - a.y1) < EDGE_TOL) {
        const ov = rangeOverlap(a.x1, a.x2, b.x1, b.x2);
        if (ov > 0.2) edges.push({ axis: 'h', coord: b.y2, span0: Math.max(a.x1,b.x1), span1: Math.min(a.x2,b.x2), ra: b, rb: a });
      }
    }
  }
  return edges;
}

function isSharedEdge(r, side, sharedEdges) {
  for (const e of sharedEdges) {
    if (side === 'left'   && e.axis === 'v' && Math.abs(e.coord - r.x1) < EDGE_TOL && rangeOverlap(r.y1,r.y2,e.span0,e.span1) > 0.1) return true;
    if (side === 'right'  && e.axis === 'v' && Math.abs(e.coord - r.x2) < EDGE_TOL && rangeOverlap(r.y1,r.y2,e.span0,e.span1) > 0.1) return true;
    if (side === 'top'    && e.axis === 'h' && Math.abs(e.coord - r.y1) < EDGE_TOL && rangeOverlap(r.x1,r.x2,e.span0,e.span1) > 0.1) return true;
    if (side === 'bottom' && e.axis === 'h' && Math.abs(e.coord - r.y2) < EDGE_TOL && rangeOverlap(r.x1,r.x2,e.span0,e.span1) > 0.1) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Build scene
// ---------------------------------------------------------------------------
function buildScene(rooms, adjacencyPairs) {
  wallMeshes = [];
  while (scene.children.length > 0) scene.remove(scene.children[0]);

  // ── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.7));

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
  sun.position.set(10, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
  sun.shadow.camera.top  =  25; sun.shadow.camera.bottom = -25;
  scene.add(sun);

  const fillLight = new THREE.DirectionalLight(0xd0e0ff, 0.25);
  fillLight.position.set(-8, 6, -10);
  scene.add(fillLight);

  const bounceLight = new THREE.DirectionalLight(0xffeedd, 0.15);
  bounceLight.position.set(0, -5, 0);
  scene.add(bounceLight);

  // ── Convert rooms to metre-space rects ───────────────────────────────────
  const rects = rooms
    .filter(r => r.room_type !== 'garden')
    .map(r => ({
      ...r,
      x1: r.x * PX_TO_M, y1: r.y * PX_TO_M,
      x2: (r.x + r.w) * PX_TO_M, y2: (r.y + r.h) * PX_TO_M,
      ceilH: CEILING_HEIGHTS[r.room_type] ?? 2.4,
    }));

  // Garden as flat slab
  rooms.filter(r => r.room_type === 'garden').forEach(r => {
    const rx = r.x * PX_TO_M, ry = r.y * PX_TO_M;
    const rw = r.w * PX_TO_M, rd = r.h * PX_TO_M;
    const m = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.04, rd), MAT.floorMats['garden'] || MAT.floorDefault);
    m.position.set(rx + rw/2, -0.02, ry + rd/2);
    m.receiveShadow = true;
    scene.add(m);
  });

  // ── Bounds ────────────────────────────────────────────────────────────────
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  rects.forEach(r => { minX=Math.min(minX,r.x1); minZ=Math.min(minZ,r.y1); maxX=Math.max(maxX,r.x2); maxZ=Math.max(maxZ,r.y2); });
  sceneCenter.set((minX+maxX)/2, 0, (minZ+maxZ)/2);
  sceneDiag = Math.sqrt((maxX-minX)**2 + (maxZ-minZ)**2);

  const sharedEdges = buildSharedEdges(rects, adjacencyPairs);
  const doorPlaced  = new Set();

  // ── Per-room geometry ─────────────────────────────────────────────────────
  for (const r of rects) {
    const rw = r.x2 - r.x1;
    const rd = r.y2 - r.y1;
    const rx = (r.x1 + r.x2) / 2;
    const rz = (r.y1 + r.y2) / 2;
    const ch = r.ceilH;

    // Floor
    const floorM = MAT.floorMats[r.room_type] || MAT.floorDefault;
    const floor  = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.04, rd), floorM);
    floor.position.set(rx, -0.02, rz);
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor border (skirting hint)
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(rw, 0.001, rd));
    const borderLine = new THREE.LineSegments(borderGeo, new THREE.LineBasicMaterial({ color: 0xb0a090, linewidth: 1 }));
    borderLine.position.set(rx, 0.021, rz);
    scene.add(borderLine);

    // Ceiling (only in full-height / eye-level mode — hidden in dollhouse)
    const ceilMesh = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.01, 0.03, rd - 0.01), MAT.ceil);
    ceilMesh.position.set(rx, ch + 0.015, rz);
    ceilMesh.userData.isCeiling = true;
    scene.add(ceilMesh);

    // ── Walls ──────────────────────────────────────────────────────────────
    const sides = [
      { id: 'left',   ext: !isSharedEdge(r,'left',  sharedEdges), len: rd, px: r.x1, pz: rz,  ry: Math.PI/2,  wallX: r.x1, wallZ: rz  },
      { id: 'right',  ext: !isSharedEdge(r,'right', sharedEdges), len: rd, px: r.x2, pz: rz,  ry: Math.PI/2,  wallX: r.x2, wallZ: rz  },
      { id: 'top',    ext: !isSharedEdge(r,'top',   sharedEdges), len: rw, px: rx,   pz: r.y1, ry: 0,          wallX: rx,   wallZ: r.y1 },
      { id: 'bottom', ext: !isSharedEdge(r,'bottom',sharedEdges), len: rw, px: rx,   pz: r.y2, ry: 0,          wallX: rx,   wallZ: r.y2 },
    ];

    for (const s of sides) {
      const thick = s.ext ? WALL_EXT : WALL_INT;
      const mat   = s.ext ? MAT.wallExt : MAT.wallInt;

      // Door opening on interior shared walls
      let doorOpenX = 0, doorOpenW = 0;
      if (!s.ext) {
        // Find shared edge key for this side
        for (const e of sharedEdges) {
          const key = [e.ra.label, e.rb.label].sort().join('|') + e.axis;
          if (doorPlaced.has(key)) continue;
          let match = false;
          if (s.id === 'left'   && e.axis==='v' && Math.abs(e.coord - r.x1) < EDGE_TOL) match = true;
          if (s.id === 'right'  && e.axis==='v' && Math.abs(e.coord - r.x2) < EDGE_TOL) match = true;
          if (s.id === 'top'    && e.axis==='h' && Math.abs(e.coord - r.y1) < EDGE_TOL) match = true;
          if (s.id === 'bottom' && e.axis==='h' && Math.abs(e.coord - r.y2) < EDGE_TOL) match = true;
          if (match && s.len > DOOR_W + 0.2) {
            doorOpenX = (s.len - DOOR_W) / 2;
            doorOpenW = DOOR_W;
            doorPlaced.add(key);
            break;
          }
        }
      }

      // Window opening on exterior walls (not bathroom/hallway/utility/garage)
      let winOpenX = 0, winOpenW = 0, winOpenYBase = 0;
      if (s.ext && !['bathroom','hallway','utility','garage'].includes(r.room_type) && s.len > WIN_W + 0.4) {
        winOpenX    = (s.len - WIN_W) / 2;
        winOpenW    = WIN_W;
        winOpenYBase = WIN_SILL;
      }

      const hasOpening = doorOpenW > 0 || winOpenW > 0;
      const openX   = doorOpenW > 0 ? doorOpenX : winOpenX;
      const openW   = doorOpenW > 0 ? doorOpenW : winOpenW;
      const openH   = doorOpenW > 0 ? DOOR_H    : WIN_H;
      const openY   = doorOpenW > 0 ? 0         : winOpenYBase;

      const wg = wallSegment(s.len, ch, thick, openX, openW, openH, openY, mat);
      wg.position.set(s.px, ch / 2, s.pz);
      if (s.ry) wg.rotation.y = s.ry;
      scene.add(wg);

      // Glass pane for windows
      if (winOpenW > 0) {
        const gp = new THREE.Mesh(
          new THREE.PlaneGeometry(WIN_W * 0.9, WIN_H * 0.9),
          MAT.glass
        );
        // Position glass in wall plane
        const glassGroup = new THREE.Group();
        gp.position.set(s.len/2 - winOpenX - WIN_W/2, -ch/2 + WIN_SILL + WIN_H/2, 0);
        // Flip: group is at wall pos/rot
        gp.rotation.y = 0;
        const gg = new THREE.Group();
        gg.add(gp);
        gg.position.set(s.px, ch/2, s.pz);
        if (s.ry) gg.rotation.y = s.ry;
        scene.add(gg);
      }

      // Door leaf (slightly open)
      if (doorOpenW > 0) {
        const leafGeo = new THREE.BoxGeometry(DOOR_W * 0.96, DOOR_H * 0.98, 0.04);
        const leaf    = new THREE.Mesh(leafGeo, MAT.doorLeaf);
        const pivot   = new THREE.Group();
        leaf.position.x = DOOR_W / 2;
        pivot.add(leaf);
        pivot.rotation.y = -Math.PI * 0.28;
        pivot.position.set(s.len/2 - doorOpenX - DOOR_W, -ch/2 + DOOR_H/2, 0);
        const dg = new THREE.Group();
        dg.add(pivot);
        dg.position.set(s.px, ch/2, s.pz);
        if (s.ry) dg.rotation.y = s.ry;
        scene.add(dg);
      }

      // Structural columns at exterior corners
      if (s.ext) {
        const colR = thick * 0.7;
        [-s.len/2, s.len/2].forEach(cx => {
          const col = new THREE.Mesh(new THREE.BoxGeometry(colR, ch, colR), MAT.col);
          col.position.set(cx, 0, 0);
          col.castShadow = true;
          const cg = new THREE.Group();
          cg.add(col);
          cg.position.set(s.px, ch/2, s.pz);
          if (s.ry) cg.rotation.y = s.ry;
          scene.add(cg);
          wallMeshes.push(col);
        });
      }
    }

    // Skirting board (thin strip at floor level, follows room perimeter)
    const skirtH = 0.10, skirtD = 0.02;
    [[rw, r.y1, 0], [rw, r.y2, 0], [rd, r.x1, Math.PI/2], [rd, r.x2, Math.PI/2]].forEach(([len, pos, ry]) => {
      const sk = new THREE.Mesh(new THREE.BoxGeometry(len, skirtH, skirtD), MAT.skirting);
      sk.position.set(ry ? pos : rx, skirtH/2, ry ? rz : pos);
      if (ry) sk.rotation.y = ry;
      scene.add(sk);
    });
  }

  // ── Ground plane ──────────────────────────────────────────────────────────
  const gSize = sceneDiag * 2.5;
  const gnd   = new THREE.Mesh(new THREE.PlaneGeometry(gSize, gSize), MAT.ground);
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.05;
  gnd.receiveShadow = true;
  scene.add(gnd);

  // Apply initial dollhouse mode
  setCam('overview');
}

// ---------------------------------------------------------------------------
// Dollhouse mode: clip wall height based on camera preset
// ---------------------------------------------------------------------------
function applyDollhouseMode(dollhouse) {
  // In dollhouse mode hide ceilings; in full mode show them
  scene.traverse(obj => {
    if (obj.userData && obj.userData.isCeiling) {
      obj.visible = !dollhouse;
    }
  });
  // Update mode label
  const lbl = document.getElementById('mode-label');
  if (lbl) lbl.textContent = dollhouse ? 'Dollhouse View' : 'Eye Level View';
}

// ---------------------------------------------------------------------------
// Camera presets
// ---------------------------------------------------------------------------
let orbitState = { theta: 0.8, phi: 0.7, radius: 10 };

function setCam(preset) {
  currentCam = preset;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + preset);
  if (btn) btn.classList.add('active');

  const cx = sceneCenter.x, cz = sceneCenter.z;
  // Minimum radius floor prevents a very small/compact plan (e.g. a studio)
  // from putting the camera uncomfortably close to — or inside — a wall.
  const d  = Math.max(sceneDiag, 4);

  if (preset === 'overview') {
    orbitState.theta  = Math.PI * 0.35;
    orbitState.phi    = Math.PI * 0.28;
    orbitState.radius = d * 1.45;
    applyDollhouseMode(true);
  } else if (preset === 'eyelevel') {
    orbitState.theta  = Math.PI * 0.35;
    orbitState.phi    = Math.PI * 0.38;
    orbitState.radius = d * 1.35;
    applyDollhouseMode(false);
  } else if (preset === 'top') {
    orbitState.theta  = 0.001;
    orbitState.phi    = 0.05;
    orbitState.radius = d * 1.25;
    applyDollhouseMode(true);
  }

  applyOrbit(cx, cz);
}

function applyOrbit(cx, cz) {
  const { theta, phi, radius } = orbitState;
  camera.position.set(
    cx + radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    cz + radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(sceneCenter.x, 0.5, sceneCenter.z);
}

// ---------------------------------------------------------------------------
// Touch / mouse orbit controls
// ---------------------------------------------------------------------------
function setupControls(canvas) {
  let dragging = false, prevX = 0, prevY = 0, prevDist = 0, pinching = false;

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      dragging = true; pinching = false;
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      pinching = true; dragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      prevDist = Math.sqrt(dx*dx + dy*dy);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (dragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - prevX;
      const dy = e.touches[0].clientY - prevY;
      orbitState.theta -= dx * 0.006;
      orbitState.phi = Math.max(0.05, Math.min(Math.PI * 0.49, orbitState.phi - dy * 0.006));
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      applyOrbit(sceneCenter.x, sceneCenter.z);
    } else if (pinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      orbitState.radius = Math.max(1.5, Math.min(sceneDiag * 2.5, orbitState.radius * (prevDist / dist)));
      prevDist = dist;
      applyOrbit(sceneCenter.x, sceneCenter.z);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => { dragging = false; pinching = false; });

  // Mouse fallback
  canvas.addEventListener('mousedown', e => { dragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    orbitState.theta -= (e.clientX - prevX) * 0.005;
    orbitState.phi = Math.max(0.05, Math.min(Math.PI * 0.49, orbitState.phi - (e.clientY - prevY) * 0.005));
    prevX = e.clientX; prevY = e.clientY;
    applyOrbit(sceneCenter.x, sceneCenter.z);
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('wheel', e => {
    orbitState.radius = Math.max(1.5, Math.min(sceneDiag * 2.5, orbitState.radius + e.deltaY * 0.012));
    applyOrbit(sceneCenter.x, sceneCenter.z);
  }, { passive: true });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  const canvas = document.getElementById('canvas');
  scene    = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f0e8);

  camera   = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.05, 300);
  camera.position.set(8, 8, 8);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

  setupControls(canvas);
  initMaterials();

  (function animate() {
    animId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  })();
}

// ---------------------------------------------------------------------------
// RN bridge
// ---------------------------------------------------------------------------
function sendClose() {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
}

function handleMessage(e) {
  try {
    const msg = JSON.parse(e.data);
    if (msg.type === 'rooms' && Array.isArray(msg.rooms)) {
      buildScene(msg.rooms, Array.isArray(msg.adjacencies) ? msg.adjacencies : []);
      document.getElementById('loading').style.display = 'none';
    }
  } catch(err) {
    console.error(err);
    showLoadError('Could not build the model: ' + (err && err.message ? err.message : err));
  }
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

init();

// If nothing has hidden the loading screen within 10s, the room data never
// arrived or something stalled silently — surface that instead of an
// unexplained infinite spinner.
setTimeout(function() {
  const loading = document.getElementById('loading');
  if (loading && loading.style.display !== 'none') {
    showLoadError('Still waiting for floor plan data — try reopening the 3D view');
  }
}, 10000);
</script>
</body>
</html>
`;

