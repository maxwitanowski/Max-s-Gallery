/* ============================================================
   prism.js — real 3D glass tetromino cluster (three.js)

   Same recipe as the Vivid+Co hero: bevelled glass boxes lit by
   a dark studio environment map, physically based transmission
   with chromatic dispersion, a bloom pass, drifting dust, and a
   final pass for chromatic aberration + vignette. Pieces lift,
   rotate and lock into new tetris formations on a timer.
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// ---------- tetromino definitions ----------
const SHAPES = {
  L3: [[0, 0], [0, 1], [1, 1]],
  I3: [[0, 0], [0, 1], [0, 2]],
  O:  [[0, 0], [1, 0], [0, 1], [1, 1]],
  T:  [[0, 0], [1, 0], [2, 0], [1, 1]],
};
const PIECES = ["O", "L3", "I3", "T"];
// {a: anchor of rotated bbox top-left, r: quarter turns} — verified non-overlapping & connected
const FORMATIONS = [
  [ { a: [1, 0], r: 0 }, { a: [0, 1], r: 0 }, { a: [3, 0], r: 0 }, { a: [1, 3], r: 0 } ],
  [ { a: [2, 3], r: 0 }, { a: [1, 1], r: 0 }, { a: [0, 0], r: 0 }, { a: [3, 1], r: 2 } ],
  [ { a: [2, 1], r: 0 }, { a: [4, 0], r: 0 }, { a: [0, 3], r: 1 }, { a: [0, 0], r: 0 } ],
  [ { a: [0, 0], r: 0 }, { a: [2, 0], r: 1 }, { a: [4, 0], r: 0 }, { a: [0, 2], r: 2 } ],
];

const centerOf = (cells) => {
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};
const rot90 = (x, y, k) => { k = ((k % 4) + 4) % 4; for (let i = 0; i < k; i++) [x, y] = [-y, x]; return [x, y]; };
const offsetsFor = (shape, k) => { const c = centerOf(shape); return shape.map(([x, y]) => rot90(x - c[0], y - c[1], k)); };
const pivotFor = (shape, k, anchor) => {
  const o = offsetsFor(shape, k);
  return [anchor[0] - Math.min(...o.map(v => v[0])), anchor[1] - Math.min(...o.map(v => v[1]))];
};
const formationBounds = (f) => {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  PIECES.forEach((name, i) => {
    const s = SHAPES[name], p = pivotFor(s, f[i].r, f[i].a);
    offsetsFor(s, f[i].r).forEach(([ox, oy]) => {
      const x = p[0] + ox, y = p[1] + oy;
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    });
  });
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
};

// cubic-bezier(0.52, 0.01, 0, 1) — the site's focus-pull curve
const bezier = (p1x, p1y, p2x, p2y) => {
  const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = (a1) => 3 * a1;
  const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const s = slope(t, p1x, p2x); if (Math.abs(s) < 1e-6) break; t -= (calc(t, p1x, p2x) - x) / s; }
    return calc(t, p1y, p2y);
  };
};
const easeFocus = bezier(0.52, 0.01, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;

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

export class Prism {
  constructor(container, opts = {}) {
    this.container = container;
    this.holdMs = opts.holdMs ?? 5200;
    this.moveMs = opts.moveMs ?? 1800;
    this.offsetX = opts.offsetX ?? 1.6;   // shift the cluster right of centre, like the reference
    this.tilt = opts.tilt ?? { x: -0.10, y: 0.34, z: -0.12 };

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    this.canvas = canvas;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { container.classList.add("is-unsupported"); return; }
    this.renderer = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping; // graded in the final pass
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, 17);

    this.buildEnvironment();
    this.buildPieces();
    this.buildDust();
    this.buildLights();
    this.buildComposer();

    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.hasMouse = false;
    this.fIndex = 0;
    this.running = true;
    this.inView = true;

    this.resize();
    this.spawnScattered();
    const now = performance.now();
    this.goTo(0, now + 400, 2400);
    this.nextAt = now + 400 + 2400 + this.holdMs;

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
    panel(7, 4, 0xfffdf9, 9, new THREE.Vector3(-6, 6, 5));       // key: big warm-white top-left
    panel(2.5, 8, 0xc9dcff, 4, new THREE.Vector3(8, 0.5, 3));     // fill: tall cool strip right
    panel(12, 0.4, 0xffffff, 18, new THREE.Vector3(0, 7.5, -1));  // hard thin strip overhead -> crisp edge lines
    panel(0.4, 10, 0xffffff, 12, new THREE.Vector3(-8, -1, -2));  // thin vertical strip left
    panel(5, 2, 0xfff3e0, 4, new THREE.Vector3(3, -6, -4));       // low warm rim from behind
    panel(1.2, 1.2, 0xffffff, 16, new THREE.Vector3(2, 3, 8));    // small hot spot in front -> face highlight
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();
  }

  buildPieces() {
    this.group = new THREE.Group();
    this.group.rotation.set(this.tilt.x, this.tilt.y, this.tilt.z);
    this.group.position.set(this.offsetX, 0.9, 0);
    this.scene.add(this.group);

    this.geometry = new RoundedBoxGeometry(0.94, 0.94, 0.94, 6, 0.075);
    // Smoked glass with strong studio reflections. Metalness lifts the head-on
    // reflectance well above plain dielectric glass (the Vivid look), while
    // transmission + dispersion keeps the rainbow fringes on the bevels.
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6fa,
      metalness: 0.3,
      roughness: 0.07,
      transmission: 1,
      thickness: 1.6,
      ior: 1.5,
      dispersion: 18,
      attenuationColor: new THREE.Color(0x0b0d12),
      attenuationDistance: 0.55,
      envMapIntensity: 1.7,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      specularIntensity: 1,
      side: THREE.FrontSide,
    });

    this.pieces = PIECES.map((name, i) => {
      const shape = SHAPES[name];
      const g = new THREE.Group();
      offsetsFor(shape, 0).forEach(([ox, oy]) => {
        const m = new THREE.Mesh(this.geometry, this.material);
        m.position.set(ox, -oy, 0); // grid y goes down, world y goes up
        g.add(m);
      });
      this.group.add(g);
      return { name, shape, i, g, x: 0, y: 0, a: 0, from: null, to: null, t0: 0, t1: 0, lift: 0, seed: Math.random() * 100, tumble: new THREE.Vector2() };
    });
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
    // a small hot light that follows the cursor — every cube catches it from a different angle
    this.cursorLight = new THREE.PointLight(0xfffdf9, 7, 40, 2);
    this.cursorLight.position.set(0, 0, 8);
    this.scene.add(this.cursorLight);
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
    // keep the cluster roughly the same fraction of the viewport width
    const vis = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const mobile = w < 900;
    const wanted = mobile ? vis * 0.7 : Math.min(6.4, Math.max(4.2, vis * 0.42));
    this.group.scale.setScalar(wanted / 6.4);
    // desktop: right of the headline, a touch high. mobile: centred in the band between headline and copy
    this.group.position.set(mobile ? 0 : this.offsetX * this.group.scale.x, mobile ? 0.5 : 0.9, 0);
    this.W = w; this.H = h;
  }

  targetsFor(f) {
    const b = formationBounds(f);
    return this.pieces.map((p, i) => {
      const pv = pivotFor(p.shape, f[i].r, f[i].a);
      return { x: pv[0] - b.cx, y: -(pv[1] - b.cy), r: f[i].r };
    });
  }

  spawnScattered() {
    this.pieces.forEach((p, i) => {
      const ang = (i / this.pieces.length) * Math.PI * 2 + 0.9;
      p.x = Math.cos(ang) * 11; p.y = Math.sin(ang) * 7; p.a = (Math.random() - 0.5) * 4;
      p.z = -3 + Math.random() * 2;
    });
  }

  goTo(fi, t0, dur) {
    this.fIndex = fi;
    const tg = this.targetsFor(FORMATIONS[fi]);
    this.pieces.forEach((p, i) => {
      const want = -tg[i].r * Math.PI / 2; // grid rotation is clockwise on screen
      let da = ((want - p.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.random() < 0.2) da += Math.sign(da || 1) * Math.PI * 2;
      p.from = { x: p.x, y: p.y, a: p.a, z: p.z || 0 };
      p.to = { x: tg[i].x, y: tg[i].y, a: p.a + da, z: 0 };
      p.t0 = t0 + i * 160; p.t1 = p.t0 + dur;
      p.lift = 1.2 + Math.random() * 1.4;
      p.tumble.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9);
    });
  }

  frame(now) {
    if (!this.running || !this.inView) return;
    const t = now / 1000;

    if (now > this.nextAt) {
      this.goTo((this.fIndex + 1) % FORMATIONS.length, now, this.moveMs);
      this.nextAt = now + this.moveMs + this.pieces.length * 160 + this.holdMs;
    }

    // pieces
    this.pieces.forEach((p) => {
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

    // cursor: tilt the cluster a touch and move the hot light
    this.mouse.lerp(this.mouseTarget, 0.05);
    const mx = this.hasMouse ? this.mouse.x : Math.sin(t * 0.25) * 0.4;
    const my = this.hasMouse ? this.mouse.y : Math.cos(t * 0.2) * 0.3;
    this.group.rotation.y = this.tilt.y + mx * 0.16;
    this.group.rotation.x = this.tilt.x - my * 0.10;
    this.cursorLight.position.set(mx * 9, my * 6, 8);

    // dust drifts up and sways
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

// ---------- boot ----------
const heroHost = document.getElementById("prism");
if (heroHost) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    new Prism(heroHost, { holdMs: reduced ? 1e9 : 5200, moveMs: 1800 });
  } catch (e) {
    console.warn("Prism unavailable:", e);
    heroHost.classList.add("is-unsupported");
  }
}
