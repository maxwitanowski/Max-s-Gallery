/* ============================================================
   prism.js — the hero artifact (three.js)

   One shared stage: a black studio environment map, drifting dust,
   a hot light that follows the cursor, bloom, and a final grade pass
   (ACES + chromatic aberration + vignette).

   On top of that stage sits ONE artifact, picked at random on every
   page load. Each is a real 3D object lit by the same environment:

     cubes     glass tetrominoes locking into formations  (the original)
     steve     a spinning gold figure, brushed rather than mirrored
     ticker    a split-flap market board, prices always moving
     notebook  a notebook riffling through ruled pages
     earth     a slowly spinning Earth

   Force one with ?hero=steve (etc). The last one shown is remembered
   for the session so a refresh always gives you something different.
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// ---------- tetromino definitions ----------
const SHAPES = {
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  L3: [[0, 0], [0, 1], [1, 1]],
  I3: [[0, 0], [1, 0], [2, 0]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
};
const PIECES = ["O", "L3", "I3", "T"];
// {a: anchor of rotated bbox top-left, r: quarter turns} — verified non-overlapping & connected
const FORMATIONS = [
  [{ a: [0, 0], r: 0 }, { a: [2, 0], r: 0 }, { a: [0, 2], r: 0 }, { a: [3, 1], r: 1 }],
  [{ a: [1, 0], r: 0 }, { a: [3, 0], r: 1 }, { a: [0, 0], r: 1 }, { a: [1, 2], r: 0 }],
  [{ a: [0, 1], r: 0 }, { a: [0, 0], r: 3 }, { a: [2, 0], r: 1 }, { a: [2, 2], r: 2 }],
  [{ a: [2, 1], r: 0 }, { a: [0, 2], r: 2 }, { a: [0, 0], r: 0 }, { a: [3, 0], r: 1 }],
];
const centerOf = (cells) => {
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};
const rot90 = (x, y, k) => { k = ((k % 4) + 4) % 4; for (let i = 0; i < k; i++)[x, y] = [-y, x]; return [x, y]; };
const offsetsFor = (shape, k) => { const c = centerOf(shape); return shape.map(([x, y]) => rot90(x - c[0], y - c[1], k)); };
const pivotFor = (shape, k, anchor) => {
  const offs = offsetsFor(shape, k);
  const minx = Math.min(...offs.map((o) => o[0])), miny = Math.min(...offs.map((o) => o[1]));
  return [anchor[0] - minx, anchor[1] - miny];
};
const formationBounds = (f) => {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  f.forEach((slot, i) => {
    const offs = offsetsFor(SHAPES[PIECES[i]], slot.r);
    const pv = pivotFor(SHAPES[PIECES[i]], slot.r, slot.a);
    offs.forEach(([ox, oy]) => {
      minx = Math.min(minx, pv[0] + ox); maxx = Math.max(maxx, pv[0] + ox);
      miny = Math.min(miny, pv[1] + oy); maxy = Math.max(maxy, pv[1] + oy);
    });
  });
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
};

// cubic-bezier(0.52, 0.01, 0, 1) — the site's focus-pull curve
const bezier = (p1x, p1y, p2x, p2y) => {
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = (a1) => 3 * a1;
  const calc = (x, a1, a2) => ((A(a1, a2) * x + B(a1, a2)) * x + C(a1)) * x;
  const slope = (x, a1, a2) => 3 * A(a1, a2) * x * x + 2 * B(a1, a2) * x + C(a1);
  return (t) => {
    let x = t;
    for (let i = 0; i < 8; i++) { const s = slope(x, p1x, p2x); if (Math.abs(s) < 1e-6) break; x -= (calc(x, p1x, p2x) - t) / s; }
    return calc(x, p1y, p2y);
  };
};
const easeFocus = bezier(0.52, 0.01, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------- final grade pass: ACES + sRGB, chromatic aberration, vignette, bg composite ----------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAberration: { value: 0.0022 },
    uVignette: { value: 0.5 },
    uBg: { value: new THREE.Color(0x0a0a0a) },
    uExposure: { value: 0.95 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uAberration, uVignette, uExposure;
    uniform vec3 uBg;
    varying vec2 vUv;
    vec3 aces(vec3 x) {
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }
    void main() {
      vec2 d = vUv - 0.5;
      float r = length(d);
      vec2 off = d * uAberration * (0.4 + r * 2.2);
      vec4 s = texture2D(tDiffuse, vUv);
      float cr = texture2D(tDiffuse, vUv + off).r;
      float cb = texture2D(tDiffuse, vUv - off).b;
      float ar = texture2D(tDiffuse, vUv + off).a;
      float ab = texture2D(tDiffuse, vUv - off).a;
      vec3 col = vec3(cr, s.g, cb) * uExposure;
      float a = clamp(max(s.a, max(ar, ab)), 0.0, 1.0);
      col = toSRGB(aces(col));
      float vig = 1.0 - smoothstep(0.35, 0.9, r) * uVignette;
      col *= vig;
      gl_FragColor = vec4(mix(uBg, col, a), 1.0);
    }`,
};

/* ---------- texture helpers ---------- */

// The Claude mark, filled white onto a transparent canvas. The path is authored
// in a 24x24 box, so scale the context rather than rewriting the coordinates.
const CLAUDE_MARK = "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z";
function makeClaudeBadge() {
  const S = 256;
  const cv = document.createElement("canvas"); cv.width = cv.height = S;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, S, S);
  c.save(); c.scale(S / 24, S / 24);
  c.fillStyle = "#f7f7f5";
  c.fill(new Path2D(CLAUDE_MARK));
  c.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// Ruled notebook paper.
function makeRuledPaper() {
  const W = 512, H = 682;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "#efe9da"; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(96, 124, 150, 0.42)"; c.lineWidth = 2;
  const top = 78, gap = 34;
  for (let y = top; y < H - 40; y += gap) {
    c.beginPath(); c.moveTo(40, y); c.lineTo(W - 34, y); c.stroke();
  }
  c.strokeStyle = "rgba(178, 86, 86, 0.40)"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(70, 28); c.lineTo(70, H - 28); c.stroke(); // margin rule
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ============================================================
   Artifacts. Each one gets the Hero instance as `ctx` and owns
   ctx.group. build() runs once, fit() on resize, update() per frame.
   `nominal` is the artifact's natural width, used to scale it into
   the same slot the cube cluster occupies.
   ============================================================ */

// ---------------------------------------------------------- 01 glass cubes
const cubes = {
  nominal: 6.4,
  tilt: { x: -0.10, y: 0.34, z: -0.12 },
  build(ctx) {
    const s = ctx.state;
    s.geometry = new RoundedBoxGeometry(0.94, 0.94, 0.94, 6, 0.075);
    // Smoked glass with strong studio reflections: metalness lifts the head-on
    // reflectance above plain dielectric glass, transmission + dispersion keep
    // the rainbow fringes on the bevels.
    s.material = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6fa, metalness: 0.3, roughness: 0.07, transmission: 1,
      thickness: 1.6, ior: 1.5, dispersion: 18,
      attenuationColor: new THREE.Color(0x0b0d12), attenuationDistance: 0.55,
      envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: 0.03,
      specularIntensity: 1, side: THREE.FrontSide,
    });
    s.pieces = PIECES.map((name, i) => {
      const shape = SHAPES[name];
      const g = new THREE.Group();
      offsetsFor(shape, 0).forEach(([ox, oy]) => {
        const m = new THREE.Mesh(s.geometry, s.material);
        m.position.set(ox, -oy, 0);
        g.add(m);
      });
      ctx.group.add(g);
      return { name, shape, i, g, x: 0, y: 0, z: 0, a: 0, from: null, to: null, t0: 0, t1: 0, lift: 0, seed: Math.random() * 100, tumble: new THREE.Vector2() };
    });
    // scatter, then fly into the first formation
    s.pieces.forEach((p, i) => {
      const ang = (i / s.pieces.length) * Math.PI * 2 + 0.9;
      p.x = Math.cos(ang) * 11; p.y = Math.sin(ang) * 7; p.a = (Math.random() - 0.5) * 4; p.z = -3 + Math.random() * 2;
    });
    s.fIndex = 0;
    const now = performance.now();
    this.goTo(ctx, 0, now + 400, 2400);
    s.nextAt = now + 400 + 2400 + ctx.holdMs;
  },
  targetsFor(ctx, f) {
    const b = formationBounds(f);
    return ctx.state.pieces.map((p, i) => {
      const pv = pivotFor(p.shape, f[i].r, f[i].a);
      return { x: pv[0] - b.cx, y: -(pv[1] - b.cy), r: f[i].r };
    });
  },
  goTo(ctx, fi, t0, dur) {
    const s = ctx.state;
    s.fIndex = fi;
    const tg = this.targetsFor(ctx, FORMATIONS[fi]);
    s.pieces.forEach((p, i) => {
      const want = -tg[i].r * Math.PI / 2;
      let da = ((want - p.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.random() < 0.2) da += Math.sign(da || 1) * Math.PI * 2;
      p.from = { x: p.x, y: p.y, a: p.a, z: p.z || 0 };
      p.to = { x: tg[i].x, y: tg[i].y, a: p.a + da, z: 0 };
      p.t0 = t0 + i * 160; p.t1 = p.t0 + dur;
      p.lift = 1.2 + Math.random() * 1.4;
      p.tumble.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9);
    });
  },
  update(ctx, t, now, mx, my) {
    const s = ctx.state;
    if (now > s.nextAt) {
      this.goTo(ctx, (s.fIndex + 1) % FORMATIONS.length, now, ctx.moveMs);
      s.nextAt = now + ctx.moveMs + s.pieces.length * 160 + ctx.holdMs;
    }
    s.pieces.forEach((p) => {
      let k = 1, z = 0, e = 1;
      if (p.from) {
        k = Math.min(1, Math.max(0, (now - p.t0) / (p.t1 - p.t0)));
        e = easeFocus(k);
        p.x = lerp(p.from.x, p.to.x, e); p.y = lerp(p.from.y, p.to.y, e); p.a = lerp(p.from.a, p.to.a, e);
        z = lerp(p.from.z, p.to.z, e) + Math.sin(k * Math.PI) * p.lift;
        if (k >= 1) { p.from = null; p.a = p.to.a; p.z = 0; }
      }
      const arc = p.from ? Math.sin(k * Math.PI) : 0;
      const bobY = Math.sin(t * 0.7 + p.seed) * 0.035, bobX = Math.cos(t * 0.5 + p.seed * 1.3) * 0.02;
      p.g.position.set(p.x + bobX, p.y + bobY, z);
      p.g.rotation.set(arc * p.tumble.x + Math.sin(t * 0.6 + p.seed) * 0.02, arc * p.tumble.y + Math.cos(t * 0.45 + p.seed) * 0.02, p.a);
    });
    ctx.group.rotation.y = this.tilt.y + mx * 0.16;
    ctx.group.rotation.x = this.tilt.x - my * 0.10;
  },
};

// ---------------------------------------------------------- 02 gold Steve
const steve = {
  nominal: 2.9,
  // satin gold in a black room: it needs real light, but nothing like the
  // blast a polished metal wanted
  lights: { key: 2.4, keyColor: 0xfff0d6, ambient: 0x554634, ambientI: 1.3, rim: 0.9 },
  build(ctx) {
    const s = ctx.state;
    // Matte orange. High roughness and a low envMapIntensity keep the
    // reflections down; metalness stays low so the colour reads in a room
    // with almost nothing to reflect.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xde7a3a, metalness: 0.35, roughness: 0.62, envMapIntensity: 0.5,
    });
    // a whisper of a bevel, so the edges catch a highlight and the blocks separate
    const box = (w, h, d) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.012), mat);

    const body = new THREE.Group();
    ctx.group.add(body);
    s.body = body;

    // a blocky figure, two units tall, cast as one solid piece
    const head = box(0.52, 0.5, 0.52); head.position.y = 1.76; body.add(head);
    const torso = box(0.5, 0.75, 0.25); torso.position.y = 1.125; body.add(torso);

    // the mark, sitting just proud of the chest. alphaTest rather than blending,
    // so it cuts out cleanly and never sorts wrong against the body.
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshStandardMaterial({ map: makeClaudeBadge(), alphaTest: 0.4, roughness: 0.6, metalness: 0, envMapIntensity: 0.35 })
    );
    badge.position.set(0, 1.15, 0.1275);
    body.add(badge);

    // limbs pivot at the shoulder / hip, so the mesh hangs below its group
    const limb = (x, yTop) => {
      const g = new THREE.Group(); g.position.set(x, yTop, 0);
      const m = box(0.25, 0.75, 0.25); m.position.y = -0.375; g.add(m);
      body.add(g); return g;
    };
    s.armL = limb(-0.375, 1.5); s.armR = limb(0.375, 1.5);
    s.legL = limb(-0.125, 0.75); s.legR = limb(0.125, 0.75);

    body.position.y = -1.0; // centre the 2-unit figure on the origin
    s.spin = 0;
  },
  update(ctx, t, now, mx, my) {
    const s = ctx.state;
    // a steady turntable spin, nudged by the cursor
    s.spin += 0.006 + mx * 0.004;
    s.body.rotation.y = s.spin;
    ctx.group.rotation.x = -my * 0.26;
    ctx.group.rotation.z = mx * 0.07;
    ctx.group.position.y = ctx.baseY + Math.sin(t * 0.9) * 0.05;
    // an easy walk cycle, arms opposite legs
    const sw = Math.sin(t * 1.6) * 0.34;
    s.armL.rotation.x = sw; s.armR.rotation.x = -sw;
    s.legL.rotation.x = -sw * 0.8; s.legR.rotation.x = sw * 0.8;
  },
};

// ---------------------------------------------------------- 03 split-flap market board
const ticker = {
  nominal: 5.4,
  // the face is unlit; these only shape the metal case
  lights: { key: 1.2, keyColor: 0xffe9cc, ambient: 0x222833, ambientI: 0.9, rim: 1.1 },
  rows: [
    ["CBA", 152.06], ["BHP", 59.45], ["CSL", 172.01], ["NVDA", 182.14],
    ["WES", 78.32], ["TLS", 4.18], ["AAPL", 241.9], ["TSLA", 358.6],
  ],
  build(ctx) {
    const s = ctx.state;
    const W = 1024, H = 660;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    s.cv = cv; s.cx = cv.getContext("2d"); s.W = W; s.H = H;
    s.tex = new THREE.CanvasTexture(cv);
    s.tex.colorSpace = THREE.SRGBColorSpace;
    s.tex.anisotropy = 4;

    // rows of simulated prices; each cell flips when its character changes
    s.data = this.rows.map(([sym, px]) => ({ sym, px, base: px, prev: px, cells: [], vel: 0 }));
    s.nextTick = 0;
    s.dirty = true;

    const bw = 4.9, bh = bw * (H / W), bd = 0.22;
    // case
    const frame = new THREE.Mesh(
      new RoundedBoxGeometry(bw, bh, bd, 4, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.5 })
    );
    ctx.group.add(frame);
    // the board face, floated just in front of the case
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(bw - 0.16, bh - 0.16),
      new THREE.MeshBasicMaterial({ map: s.tex, toneMapped: false })
    );
    screen.position.z = bd / 2 + 0.004;
    ctx.group.add(screen);
    s.board = frame;
  },
  // push a new string into a row's cells, flipping only what changed
  setCells(row, str) {
    for (let i = 0; i < str.length; i++) {
      const c = row.cells[i] || (row.cells[i] = { ch: " ", next: null, t: 1 });
      if (c.next !== null ? c.next !== str[i] : c.ch !== str[i]) { c.next = str[i]; c.t = 0; }
    }
    row.cells.length = str.length;
  },
  lineFor(r) {
    const chg = ((r.px - r.base) / r.base) * 100;
    const arrow = chg >= 0 ? "▲" : "▼";
    const px = r.px.toFixed(2).padStart(8, " ");
    const pc = (Math.abs(chg) < 10 ? Math.abs(chg).toFixed(2) : "9.99").padStart(5, " ");
    return `${r.sym.padEnd(5, " ")}${px}  ${arrow}${pc}%`;
  },
  draw(ctx, t) {
    const s = ctx.state, c = s.cx, W = s.W, H = s.H;
    c.fillStyle = "#06080b"; c.fillRect(0, 0, W, H);
    // header
    c.fillStyle = "#ffb347";
    c.font = "600 30px ui-monospace, 'Cascadia Mono', Consolas, monospace";
    c.fillText("MARKET", 40, 58);
    c.fillStyle = Math.sin(t * 3) > 0 ? "#6fdc8c" : "#1d3a26";
    c.beginPath(); c.arc(W - 58, 48, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#4a5361";
    c.font = "500 22px ui-monospace, Consolas, monospace";
    c.fillText("LIVE", W - 132, 57);
    c.fillStyle = "#1a1f27"; c.fillRect(40, 78, W - 80, 2);

    const rowH = 66, top = 112, adv = 26.5, left = 44;
    c.font = "700 40px ui-monospace, 'Cascadia Mono', Consolas, monospace";
    c.textBaseline = "middle";
    s.data.forEach((r, ri) => {
      const y = top + ri * rowH;
      const up = r.px >= r.base;
      r.cells.forEach((cell, i) => {
        const x = left + i * adv;
        // the flap itself
        c.fillStyle = "#101419";
        c.fillRect(x - 2, y - 26, adv - 2, 52);
        c.fillStyle = "#070a0d";
        c.fillRect(x - 2, y - 1, adv - 2, 2); // the split-flap seam
        const ch = cell.next !== null && cell.t > 0.5 ? cell.next : cell.ch;
        if (ch !== " ") {
          // colour: symbol amber, arrow + percent by direction, price white
          const isTail = i >= 15;
          c.fillStyle = i < 5 ? "#ffb347" : isTail ? (up ? "#6fdc8c" : "#ff6b6b") : "#e8edf4";
          // squash through the middle of the flip
          const k = cell.t < 1 ? Math.abs(Math.cos(cell.t * Math.PI)) : 1;
          c.save();
          c.translate(x + adv / 2 - 2, y);
          c.scale(1, Math.max(0.04, k));
          c.textAlign = "center";
          c.fillText(ch, 0, 0);
          c.restore();
        }
      });
    });
    c.textBaseline = "alphabetic";
    s.tex.needsUpdate = true;
  },
  update(ctx, t, now, mx, my) {
    const s = ctx.state;
    // random-walk the prices a few times a second
    if (now > s.nextTick) {
      s.nextTick = now + 520 + Math.random() * 420;
      s.data.forEach((r) => {
        r.vel = r.vel * 0.55 + (Math.random() - 0.5) * r.base * 0.006;
        r.px = Math.max(0.5, r.px + r.vel);
        this.setCells(r, this.lineFor(r));
      });
      s.dirty = true;
    }
    // advance any flips
    let moving = false;
    s.data.forEach((r) => r.cells.forEach((cell) => {
      if (cell.t < 1) {
        cell.t = Math.min(1, cell.t + 0.085);
        if (cell.t >= 0.5 && cell.next !== null) { cell.ch = cell.next; cell.next = null; }
        moving = true;
      }
    }));
    if (moving || s.dirty) { this.draw(ctx, t); s.dirty = false; }

    ctx.group.rotation.y = 0.16 + mx * 0.30 + Math.sin(t * 0.25) * 0.05;
    ctx.group.rotation.x = -0.05 - my * 0.18;
    ctx.group.position.y = ctx.baseY + Math.sin(t * 0.6) * 0.045;
  },
};

// ---------------------------------------------------------- 04 riffling notebook
const notebook = {
  nominal: 4.3,
  PAGES: 7,
  // paper is a big white surface: keep the light low or bloom eats the shape
  lights: { key: 0.85, keyColor: 0xfff4e6, ambient: 0x20242e, ambientI: 0.55, rim: 0.7 },
  build(ctx) {
    const s = ctx.state;
    const PW = 1.5, PH = 2.0;
    // plain stock for the page-edge blocks, ruled stock for anything you can read
    const paper = new THREE.MeshStandardMaterial({ color: 0xbfb9a8, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.32, side: THREE.DoubleSide });
    const ruled = new THREE.MeshStandardMaterial({ map: makeRuledPaper(), color: 0xd5cfc0, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.3, side: THREE.DoubleSide });
    const cover = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.4, metalness: 0.6, envMapIntensity: 1.1 });
    s.ruled = ruled;

    const book = new THREE.Group();
    book.rotation.x = -0.42; // laid open, tipped toward the camera
    ctx.group.add(book);
    s.book = book;

    // covers, slightly larger than the pages
    const mkCover = (dir) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(PW + 0.06, PH + 0.06, 0.05, 3, 0.02), cover);
      m.position.set(dir * (PW / 2 + 0.02), 0, -0.085 * dir * 0 - 0.075);
      m.rotation.x = 0;
      book.add(m); return m;
    };
    mkCover(-1); mkCover(1);
    // the settled page stacks either side of the spine, each topped by a
    // readable ruled page so you see lines rather than a blank slab
    const stack = (dir, thick) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, thick, 2, 0.008), paper);
      m.position.set(dir * (PW / 2 + 0.01), 0, -0.04 + thick / 2);
      book.add(m);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), ruled);
      top.position.set(m.position.x, 0, -0.04 + thick + 0.003);
      if (dir < 0) top.scale.x = -1; // mirror the margin rule onto the verso
      book.add(top);
      return m;
    };
    s.leftStack = stack(-1, 0.05);
    s.rightStack = stack(1, 0.05);
    // the spine
    const spine = new THREE.Mesh(new RoundedBoxGeometry(0.07, PH + 0.06, 0.13, 3, 0.03), cover);
    spine.position.set(0, 0, -0.04);
    book.add(spine);

    // pages in flight: each pivots on the spine and curls as it goes over
    s.pages = [];
    for (let i = 0; i < this.PAGES; i++) {
      const geo = new THREE.PlaneGeometry(PW, PH, 14, 1);
      geo.translate(PW / 2, 0, 0); // pivot on the spine edge
      const mesh = new THREE.Mesh(geo, ruled);
      const pivot = new THREE.Group();
      pivot.add(mesh);
      book.add(pivot);
      s.pages.push({ pivot, mesh, geo, base: geo.attributes.position.array.slice(), phase: i / this.PAGES });
    }
    s.turn = 0;
    s.PW = PW;
  },
  update(ctx, t, now, mx, my) {
    const s = ctx.state;
    s.turn += 0.0016; // how fast the riffle runs
    s.pages.forEach((p) => {
      let k = (s.turn + p.phase) % 1;             // 0 = flat on the right, 1 = flat on the left
      const e = easeInOut(k);
      p.pivot.rotation.y = -e * Math.PI;
      // lift and curl most at the midpoint of the turn
      const mid = Math.sin(k * Math.PI);
      p.pivot.position.z = 0.012 + mid * 0.16;
      const pos = p.geo.attributes.position, base = p.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const u = x / s.PW;                        // 0 at spine, 1 at the free edge
        pos.setXYZ(i, x, y, Math.sin(u * Math.PI * 0.9) * mid * 0.30 + u * u * mid * 0.10);
      }
      pos.needsUpdate = true;
      p.geo.computeVertexNormals();
    });
    s.book.rotation.y = 0.12 + mx * 0.34;
    s.book.rotation.x = -0.42 - my * 0.20;
    ctx.group.position.y = ctx.baseY + Math.sin(t * 0.7) * 0.04;
  },
};

// ---------------------------------------------------------- 05 spinning Earth
const earth = {
  nominal: 4.2,
  // one hard key stands in for the sun, with just enough fill to keep the night side readable
  lights: { key: 2.9, keyColor: 0xfff4e2, ambient: 0x223049, ambientI: 0.45 },
  build(ctx) {
    const s = ctx.state;
    const loader = new THREE.TextureLoader();
    const day = loader.load("media/hero/earth-day.jpg", (tx) => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; });
    const clouds = loader.load("media/hero/earth-clouds.jpg");

    const globe = new THREE.Group();
    globe.rotation.z = THREE.MathUtils.degToRad(23.4); // axial tilt
    ctx.group.add(globe);
    s.globe = globe;

    s.ball = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 64, 48),
      // colour is the fallback if the texture never arrives
      new THREE.MeshStandardMaterial({ color: 0x9fb8cc, map: day, roughness: 0.86, metalness: 0.05, envMapIntensity: 0.55 })
    );
    globe.add(s.ball);

    s.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.632, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: clouds, transparent: true, opacity: 0.85, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: 0.4 })
    );
    globe.add(s.clouds);

    // atmosphere: a fresnel falloff, so it glows at the limb and fades to nothing
    // face-on. A plain translucent shell just draws a hard blue ring instead.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.80, 48, 32),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(0x6fa8ff) }, uPower: { value: 3.4 }, uStrength: { value: 1.15 } },
        vertexShader: /* glsl */`
          varying vec3 vN; varying vec3 vP;
          void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`
          uniform vec3 uColor; uniform float uPower, uStrength;
          varying vec3 vN; varying vec3 vP;
          void main() {
            vec3 V = normalize(-vP);
            float f = pow(clamp(1.0 - abs(dot(vN, V)), 0.0, 1.0), uPower);
            gl_FragColor = vec4(uColor * f * uStrength, f);
          }`,
      })
    );
    globe.add(halo);
  },
  update(ctx, t, now, mx, my) {
    const s = ctx.state;
    s.ball.rotation.y += 0.0011;
    s.clouds.rotation.y += 0.0015;
    ctx.group.rotation.y = mx * 0.28;
    ctx.group.rotation.x = -my * 0.18;
    ctx.group.position.y = ctx.baseY + Math.sin(t * 0.55) * 0.05;
  },
};

const ARTIFACTS = { cubes, steve, ticker, notebook, earth };

/* ============================================================ */

export class Hero {
  constructor(container, opts = {}) {
    this.container = container;
    this.holdMs = opts.holdMs ?? 5200;
    this.moveMs = opts.moveMs ?? 1800;
    this.offsetX = opts.offsetX ?? 3.0;
    this.variant = opts.variant && ARTIFACTS[opts.variant] ? opts.variant : "cubes";
    this.art = ARTIFACTS[this.variant];
    this.state = {};
    container.dataset.hero = this.variant;

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    this.canvas = canvas;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { container.classList.add("is-unsupported"); return; }
    this.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 17);

    this.buildEnvironment();

    this.group = new THREE.Group();
    if (this.art.tilt) this.group.rotation.set(this.art.tilt.x, this.art.tilt.y, this.art.tilt.z);
    this.scene.add(this.group);
    this.baseY = 0.9;
    this.art.build(this);

    this.buildDust();
    this.buildLights();
    this.buildComposer();

    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.hasMouse = false;
    this.running = true;
    this.inView = true;

    this.resize();
    this.bind();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  // dark studio: black room with a few emissive softboxes. Reflections come from here.
  buildEnvironment() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const panel = (w, h, color, intensity, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.material.color.multiplyScalar(intensity);
      m.position.copy(pos); m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(7, 4, 0xfffdf9, 9, new THREE.Vector3(-6, 6, 5));
    panel(2.5, 8, 0xc9dcff, 4, new THREE.Vector3(8, 0.5, 3));
    panel(12, 0.4, 0xffffff, 18, new THREE.Vector3(0, 7.5, -1));
    panel(0.4, 10, 0xffffff, 12, new THREE.Vector3(-8, -1, -2));
    panel(5, 2, 0xfff3e0, 4, new THREE.Vector3(3, -6, -4));
    panel(1.2, 1.2, 0xffffff, 16, new THREE.Vector3(2, 3, 8));
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();
  }

  buildDust() {
    const N = 120;
    const pos = new Float32Array(N * 3);
    this.dustSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
      this.dustSeed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xfffdf9, size: 0.035, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
  }

  buildLights() {
    this.cursorLight = new THREE.PointLight(0xfffdf9, 7, 40, 2);
    this.cursorLight.position.set(0, 0, 8);
    this.scene.add(this.cursorLight);
    // the non-glass artifacts need direct light to read as solid; each one
    // declares its own, since gold, paper and a lit globe want very different rigs
    const L = this.art.lights;
    if (L) {
      const key = new THREE.DirectionalLight(L.keyColor ?? 0xfff6ea, L.key ?? 1.5);
      key.position.set(-4, 5, 6);
      this.scene.add(key);
      if (L.rim) {
        const rim = new THREE.DirectionalLight(0xbfd4ff, L.rim);
        rim.position.set(5, -2, -4);
        this.scene.add(rim);
      }
      this.scene.add(new THREE.AmbientLight(L.ambient ?? 0x2a3242, L.ambientI ?? 1.0));
    }
  }

  buildComposer() {
    const size = new THREE.Vector2(2, 2);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.42, 0.65, 0.72);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  bind() {
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    window.addEventListener("pointermove", (e) => {
      const r = this.container.getBoundingClientRect();
      this.mouseTarget.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      this.hasMouse = true;
    }, { passive: true });
    document.addEventListener("visibilitychange", () => { this.running = !document.hidden; });
    this.io = new IntersectionObserver((en) => { this.inView = en[0].isIntersecting; }, { threshold: 0 });
    this.io.observe(this.container);
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const vis = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const mobile = w < 900;
    const wanted = mobile ? vis * 0.7 : Math.min(6.4, Math.max(4.2, vis * 0.42));
    this.group.scale.setScalar(wanted / this.art.nominal);
    this.baseY = mobile ? 0.5 : 0.9;
    this.group.position.set(mobile ? 0 : this.offsetX * this.group.scale.x * (this.art.nominal / 6.4), this.baseY, 0);
    this.W = w; this.H = h;
  }

  frame(now) {
    if (!this.running || !this.inView) return;
    const t = now / 1000;

    this.mouse.lerp(this.mouseTarget, 0.05);
    const mx = this.hasMouse ? this.mouse.x : Math.sin(t * 0.25) * 0.4;
    const my = this.hasMouse ? this.mouse.y : Math.cos(t * 0.2) * 0.3;

    this.art.update(this, t, now, mx, my);
    this.cursorLight.position.set(mx * 9, my * 6, 8);

    const pos = this.dust.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const s = this.dustSeed[i];
      let y = pos.getY(i) + 0.0025 + Math.sin(t * 0.3 + s) * 0.0008;
      if (y > 7.2) y = -7.2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.2 + s * 2.1) * 0.0012);
    }
    pos.needsUpdate = true;

    this.composer.render();
  }
}
// kept for anything still importing the old name
export { Hero as Prism };

// ---------- boot ----------
// Cubes stay the house style, so they come up a little more often than the rest.
const POOL = ["cubes", "cubes", "steve", "ticker", "notebook", "earth"];
function pickVariant() {
  const forced = new URLSearchParams(location.search).get("hero");
  if (forced && ARTIFACTS[forced]) return forced;
  let last = null;
  try { last = sessionStorage.getItem("hero:last"); } catch (e) { /* private mode */ }
  let pick = POOL[Math.floor(Math.random() * POOL.length)];
  if (pick === last) pick = POOL[Math.floor(Math.random() * POOL.length)]; // one re-roll, so refreshing varies
  try { sessionStorage.setItem("hero:last", pick); } catch (e) { /* ignore */ }
  return pick;
}

const heroHost = document.getElementById("prism");
if (heroHost) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    new Hero(heroHost, { variant: pickVariant(), holdMs: reduced ? 1e9 : 5200, moveMs: 1800 });
  } catch (e) {
    console.warn("Hero unavailable:", e);
    heroHost.classList.add("is-unsupported");
  }
}
