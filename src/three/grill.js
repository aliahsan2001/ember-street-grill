/* Ember Street Grill — the home hero grill (and an ember field mode).
   Coal bed with a crack-glow shader, steel grate, two procedurally modelled skewers turning
   over the coals, rising embers, smoke and bloom. Everything is generated in code. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- shared GLSL ---------- */
const NOISE = /* glsl */ `
  float hash3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise3(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash3(i+vec3(0,0,0)),hash3(i+vec3(1,0,0)),f.x),
                   mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
                   mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }`;

/* ---------- JS value noise for geometry ---------- */
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.6 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.1;

/* ---------- materials ---------- */
function coalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying float vSeed; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vSeed = aSeed;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uHeat;
      varying float vSeed; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
      ${NOISE}
      void main(){
        float up = clamp(vN.y*0.5+0.5, 0.0, 1.0);
        float rim = pow(1.0 - max(dot(vN, vView), 0.0), 2.5);
        float flicker = 0.7 + 0.3*sin(uTime*(1.3+vSeed*2.4) + vSeed*40.0);
        // thin glowing fissures where the noise field crosses its midpoint
        float n = noise3(vPos*8.0 + vec3(vSeed*13.0, uTime*0.12, 0.0));
        float crack = 1.0 - smoothstep(0.0, 0.07, abs(n - 0.5));
        // broader hot patches, stronger on the underside facing the fire
        float hotSpot = smoothstep(0.5, 0.85, noise3(vPos*2.6 + vec3(vSeed*7.0, -uTime*0.08, 0.0)));
        float heat = (crack*0.85 + hotSpot*(0.25 + (1.0-up)*0.5)) * (0.25 + vSeed) * flicker * uHeat;
        heat = clamp(heat, 0.0, 1.2);
        // black coal with pale ash on the top faces
        float ashMask = smoothstep(0.52, 0.8, noise3(vPos*20.0 + vSeed*3.0)) * smoothstep(0.35, 0.9, up);
        vec3 coal = mix(vec3(0.035,0.03,0.028), vec3(0.3,0.28,0.26), ashMask*0.75) * (0.6 + up*0.5);
        vec3 hot = mix(vec3(0.55,0.04,0.0), vec3(1.0,0.36,0.05), clamp(heat,0.0,1.0));
        vec3 col = coal*(1.0 - min(heat,1.0)*0.85) + hot*heat*2.0;
        col += vec3(0.9,0.18,0.02) * rim * 0.18 * vSeed * uHeat;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function emberMaterial(pixelRatio) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: pixelRatio },
      uMouse: { value: new THREE.Vector2() },
      uBase: { value: -1.8 },
      uHeight: { value: 6.5 },
      uArea: { value: new THREE.Vector3(4.5, 0, 1.8) },
      uSize: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uPixel, uBase, uHeight, uSize; uniform vec2 uMouse; uniform vec3 uArea;
      attribute vec4 aRand;
      varying float vAlpha; varying float vHeat;
      void main(){
        float speed = 0.35 + aRand.x*0.75;
        float life = fract(aRand.y + uTime*speed/uHeight);
        vec3 p;
        p.y = uBase + life*uHeight;
        p.x = (aRand.z-0.5)*2.0*uArea.x + sin(uTime*(0.6+aRand.w) + aRand.y*20.0)*0.45*life + uMouse.x*life*1.4;
        p.z = (aRand.w-0.5)*2.0*uArea.z + cos(uTime*0.5 + aRand.x*10.0)*0.3*life;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        float size = (1.6 + aRand.x*aRand.x*6.0) * (1.0 - life*0.55) * uSize;
        gl_PointSize = size * uPixel * (9.0 / -mv.z);
        vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.45, 1.0, life)) * (0.55 + 0.45*sin(uTime*8.0 + aRand.z*60.0));
        vHeat = 1.0 - life;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha; varying float vHeat;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(1.0,0.22,0.02), vec3(1.0,0.78,0.38), vHeat*vHeat);
        gl_FragColor = vec4(col*1.8, a*vAlpha);
      }`,
  });
}

function backdrop(colorTop, colorGlow, glowY) {
  const m = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uTop: { value: new THREE.Color(colorTop) }, uGlow: { value: new THREE.Color(colorGlow) }, uY: { value: glowY } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uGlow; uniform float uTime, uY; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv - vec2(0.5, uY);
        p.x *= 1.6;
        float g = exp(-dot(p,p)*5.0);
        float n = noise3(vec3(vUv*3.0, uTime*0.05));
        vec3 col = mix(uTop, uGlow, g*(0.75+0.25*n));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), m);
  mesh.position.z = -7;
  return mesh;
}

function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- geometry builders ---------- */
function coalGeometry() {
  let g = new THREE.IcosahedronGeometry(0.17, 2);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.72 + fbm(v.x * 9 + 3, v.y * 9, v.z * 9) * 0.6;
    v.multiplyScalar(k);
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function coalBed(count, spread) {
  const geo = coalGeometry();
  const seeds = new Float32Array(count);
  const mesh = new THREE.InstancedMesh(geo, coalMaterial(), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    pos.set(Math.cos(a) * r * spread.x, spread.y + Math.random() * 0.22 - r * 0.12, Math.sin(a) * r * spread.z);
    e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    q.setFromEuler(e);
    const k = 0.7 + Math.random() * 0.9;
    s.set(k * (0.8 + Math.random() * 0.5), k * (0.7 + Math.random() * 0.4), k * (0.8 + Math.random() * 0.5));
    m.compose(pos, q, s);
    mesh.setMatrixAt(i, m);
    // hotter towards the middle of the bed
    seeds[i] = Math.min(1, Math.random() * 0.7 + (1 - r) * 0.5);
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  return mesh;
}

// paint vertex colours: base, char and highlight driven by noise
function paint(geo, base, char, high, opts = {}) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const cb = new THREE.Color(base), cc = new THREE.Color(char), ch = new THREE.Color(high);
  const herb = opts.herb ? new THREE.Color(opts.herb) : null;
  const o = opts.offset || 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + o, y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 6, y * 6, z * 6);
    const burn = Math.max(0, Math.min(1, (fbm(x * 3 + 9, y * 3, z * 3) - 0.48) * 4));
    c.copy(cb).lerp(ch, Math.max(0, (n - 0.55) * 2.2));
    c.lerp(cc, burn * (opts.charAmount ?? 0.85));
    if (herb && hash(Math.round(x * 40), Math.round(y * 40), Math.round(z * 40)) > 0.93) c.lerp(herb, 0.8);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function meatMaterial() {
  return new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.74, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.6 });
}

function seekhSkewer(envMap) {
  const group = new THREE.Group();
  // capsule along X with hand-pressed ridges
  const geo = new THREE.CapsuleGeometry(0.17, 2.3, 12, 36);
  geo.rotateZ(Math.PI / 2);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ang = Math.atan2(v.z, v.y);
    const ridge = Math.sin(v.x * 13.0 + Math.sin(ang * 2.0) * 0.6) * 0.035;
    const lump = (fbm(v.x * 4 + 5, v.y * 4, v.z * 4) - 0.5) * 0.12;
    const k = 1 + ridge / 0.17 * 0.6 + lump;
    v.y *= k; v.z *= k;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  paint(geo, '#4f2611', '#0b0503', '#8a4c22', { herb: '#2c4410', charAmount: 1 });
  const meat = new THREE.Mesh(geo, meatMaterial());
  group.add(meat);
  group.add(rod(envMap));
  return group;
}

function tikkaSkewer(envMap) {
  const group = new THREE.Group();
  const meatMat = meatMaterial();
  const pattern = ['m', 'o', 'm', 'c', 'm', 'o', 'm', 'c', 'm'];
  const step = 0.36;
  pattern.forEach((type, i) => {
    const x = (i - (pattern.length - 1) / 2) * step;
    let mesh;
    if (type === 'm') {
      const geo = new THREE.BoxGeometry(0.34, 0.32, 0.32, 8, 8, 8);
      const p = geo.attributes.position, v = new THREE.Vector3();
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j);
        const len = v.length();
        v.lerp(v.clone().normalize().multiplyScalar(0.19), 0.55);
        v.multiplyScalar(1 + (fbm(v.x * 7 + i * 3, v.y * 7, v.z * 7) - 0.5) * 0.35);
        p.setXYZ(j, v.x, v.y, v.z);
        void len;
      }
      geo.computeVertexNormals();
      paint(geo, '#8a2c0d', '#120503', '#c46a24', { offset: i * 1.7, charAmount: 0.95 });
      mesh = new THREE.Mesh(geo, meatMat);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    } else if (type === 'o') {
      const geo = new THREE.CylinderGeometry(0.2, 0.22, 0.05, 28, 1);
      geo.rotateZ(Math.PI / 2);
      mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#c58aa8', roughness: 0.35, transmission: 0, clearcoat: 0.6, envMapIntensity: 0.4 }));
      mesh.scale.set(1, 1, 0.85);
    } else {
      const geo = new THREE.BoxGeometry(0.05, 0.3, 0.26, 1, 4, 4);
      const p = geo.attributes.position;
      for (let j = 0; j < p.count; j++) p.setX(j, p.getX(j) + Math.pow(p.getY(j), 2) * 0.7);
      geo.computeVertexNormals();
      mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#2f6b14', roughness: 0.25, clearcoat: 0.8, envMapIntensity: 0.5 }));
      mesh.rotation.x = Math.random() * 3;
    }
    mesh.position.x = x;
    group.add(mesh);
  });
  group.add(rod(envMap));
  return group;
}

function rod(envMap) {
  const mat = new THREE.MeshStandardMaterial({ color: '#d8d2cc', metalness: 1, roughness: 0.28, envMap, envMapIntensity: 0.9 });
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.1, 10), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.x = 0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 10, 28), mat);
  ring.position.x = 2.3;
  ring.rotation.y = Math.PI / 2;
  g.add(bar, ring);
  return g;
}

function grate(envMap) {
  const mat = new THREE.MeshStandardMaterial({ color: '#2a2320', metalness: 0.85, roughness: 0.45, envMap, envMapIntensity: 0.25 });
  const g = new THREE.Group();
  const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 9.5, 8);
  barGeo.rotateZ(Math.PI / 2);
  const count = 15;
  const bars = new THREE.InstancedMesh(barGeo, mat, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.makeTranslation(0, 0, (i - (count - 1) / 2) * 0.24);
    bars.setMatrixAt(i, m);
  }
  g.add(bars);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.08, 0.08), mat);
  rail.position.z = 1.85;
  const rail2 = rail.clone();
  rail2.position.z = -1.85;
  g.add(rail, rail2);
  return g;
}

/* ---------- scene runner ---------- */
export function mountGrill(canvas) {
  const mode = canvas.dataset.scene;
  const wrap = canvas.parentElement;
  const isSmall = () => wrap.clientWidth < 760;
  const dpr = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 1.75);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c0908, 0.045);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const bg = backdrop('#0c0908', mode === 'grill' ? '#3a1406' : '#2a0e05', mode === 'grill' ? 0.3 : 0.0);
  scene.add(bg);

  const updatables = [];
  let embers, skewers, coals, world;
  const flickerLights = [];

  if (mode === 'grill') {
    // everything that makes up the grill lives in one group so it can be framed per screen size
    world = new THREE.Group();
    scene.add(world);

    coals = coalBed(isSmall() ? 320 : 500, new THREE.Vector3(isSmall() ? 5.8 : 4.8, -1.85, 1.75));
    world.add(coals);
    updatables.push(coals.material);

    const gr = grate(envMap);
    gr.position.y = -1.38;
    world.add(gr);

    skewers = new THREE.Group();
    const seekh = seekhSkewer(envMap);
    seekh.position.set(0, 0, -0.42);
    const tikka = tikkaSkewer(envMap);
    tikka.position.set(-0.18, 0.03, 0.42);
    skewers.add(seekh, tikka);
    skewers.userData = { seekh, tikka };
    world.add(skewers);

    const smokeMat = new THREE.SpriteMaterial({ map: smokeTexture(), color: 0x7a6a60, transparent: true, depthWrite: false, opacity: 0.0 });
    const smoke = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(smokeMat.clone());
      s.userData = { seed: Math.random(), x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 3 };
      world.add(s);
      smoke.push(s);
    }
    skewers.userData.smoke = smoke;

    scene.add(new THREE.HemisphereLight(0x8a6a58, 0x140806, 0.35));
    const key = new THREE.DirectionalLight(0xffe0c0, 1.5);
    key.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(0x86a6ff, 0.9);
    rim.position.set(3, 2.5, -4);
    scene.add(key, rim);
    [[-3.2, 0], [0, 0.4], [2.2, -0.2], [3.6, 0.5]].forEach(([x, z], i) => {
      const l = new THREE.PointLight(0xff5a1a, 2.6, 5, 1.4);
      l.position.set(x, -1.95, z);
      l.userData.phase = i * 2.1;
      world.add(l);
      flickerLights.push(l);
    });
  } else {
    coals = coalBed(46, new THREE.Vector3(7, -0.2, 2.5));
    // scatter coals through the volume rather than a flat bed
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    coals.userData.base = [];
    for (let i = 0; i < coals.count; i++) {
      coals.getMatrixAt(i, m);
      m.decompose(p, q, s);
      p.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 5, -1 - Math.random() * 4);
      s.multiplyScalar(0.7 + Math.random());
      m.compose(p, q, s);
      coals.setMatrixAt(i, m);
      coals.userData.base.push({ p: p.clone(), q: q.clone(), s: s.clone(), spin: (Math.random() - 0.5) * 0.6, bob: Math.random() * 6 });
    }
    coals.material.uniforms.uHeat.value = 0.8;
    scene.add(coals);
    updatables.push(coals.material);
  }

  // embers
  {
    const N = mode === 'grill' ? (isSmall() ? 360 : 620) : 380;
    const geo = new THREE.BufferGeometry();
    const rand = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) rand[i] = Math.random();
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const mat = emberMaterial(dpr);
    if (mode !== 'grill') {
      mat.uniforms.uBase.value = -3.2;
      mat.uniforms.uHeight.value = 7;
      mat.uniforms.uArea.value.set(7.5, 0, 2.5);
      mat.uniforms.uSize.value = 0.9;
    }
    embers = new THREE.Points(geo, mat);
    embers.frustumCulled = false;
    (world || scene).add(embers);
    updatables.push(mat);
  }

  // post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // high threshold: only coals and embers (values above 1) bloom, not the food
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), mode === 'grill' ? 0.7 : 0.9, 0.55, mode === 'grill' ? 0.6 : 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // layout
  let frame;
  function layout() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w * 0.5, h * 0.5);
    camera.aspect = w / h;
    if (mode === 'grill') {
      const small = w < 760;
      const aspect = w / h;
      // desktop: grill fills the lower half, skewers sit on the right clear of the headline
      // phone: grill sits in the top third, above the stacked text
      frame = small
        ? { fov: 46, pos: new THREE.Vector3(0, 3.0, 5.4), look: new THREE.Vector3(0, -1.4, 0) }
        : { fov: 32, pos: new THREE.Vector3(0, 3.1, 9.6), look: new THREE.Vector3(0.2, -1.25, 0) };
      camera.fov = frame.fov;
      // half the visible width at the skewers' depth, so placement holds at any aspect ratio
      const halfW = Math.tan(THREE.MathUtils.degToRad(frame.fov / 2)) * 10 * aspect;
      world.position.x = small ? 0 : halfW * 0.4;
      skewers.position.set(small ? 0 : halfW * 0.22, -1.1, 0.4);
      skewers.rotation.y = small ? -0.12 : -0.3;
      skewers.scale.setScalar(small ? 0.74 : THREE.MathUtils.clamp(halfW * 0.22, 0.7, 1.1));
      skewers.userData.baseY = skewers.position.y;
    } else {
      camera.fov = 40;
      camera.position.set(0, 0, 8);
    }
    camera.updateProjectionMatrix();
    if (REDUCED) render(0);
  }
  const ro = new ResizeObserver(layout);
  ro.observe(wrap);

  // input
  const mouse = new THREE.Vector2(), smooth = new THREE.Vector2();
  const onMove = (e) => mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  window.addEventListener('pointermove', onMove, { passive: true });

  // run only while visible
  let visible = true, running = false;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: 0 });
  io.observe(wrap);
  document.addEventListener('visibilitychange', kick);

  const clock = new THREE.Clock();
  let t = 4;

  function render(dt) {
    t += dt;
    smooth.lerp(mouse, 0.05);
    updatables.forEach((m) => { m.uniforms.uTime.value = t; });
    if (embers) embers.material.uniforms.uMouse.value.copy(smooth);
    bg.material.uniforms.uTime.value = t;

    const scroll = Math.min(1, window.scrollY / Math.max(1, wrap.clientHeight));

    if (mode === 'grill') {
      const { seekh, tikka, smoke } = skewers.userData;
      // skewers turn slowly on the grate, like a cook rolling them by hand
      seekh.rotation.x += dt * 0.3;
      tikka.rotation.x -= dt * 0.24;
      skewers.position.y = skewers.userData.baseY + Math.sin(t * 9) * 0.004;
      world.rotation.y = smooth.x * 0.07;
      flickerLights.forEach((l) => {
        const ph = l.userData.phase;
        l.intensity = 2.6 + Math.sin(t * 7 + ph) * 0.4 + Math.sin(t * 13.3 + ph * 2) * 0.25 + Math.sin(t * 2.1 + ph) * 0.5;
      });
      smoke.forEach((s) => {
        const d = s.userData;
        const life = (d.seed + t * 0.045) % 1;
        s.position.set(d.x + Math.sin(t * 0.3 + d.seed * 9) * 0.6 + smooth.x * life, -1.3 + life * 5.5, d.z);
        const k = 1.4 + life * 4;
        s.scale.set(k, k, 1);
        s.material.opacity = Math.sin(life * Math.PI) * 0.08;
        s.material.rotation = d.seed * 6 + t * 0.05;
      });
      camera.position.set(frame.pos.x + smooth.x * 0.45, frame.pos.y + smooth.y * 0.2 + scroll * 1.6, frame.pos.z);
      camera.lookAt(frame.look.x, frame.look.y - scroll * 0.4, frame.look.z);
    } else {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      coals.userData.base.forEach((b, i) => {
        e.set(t * b.spin, t * b.spin * 0.7, 0);
        q.setFromEuler(e).premultiply(b.q);
        const p = b.p.clone();
        p.y += Math.sin(t * 0.6 + b.bob) * 0.15;
        m.compose(p, q, b.s);
        coals.setMatrixAt(i, m);
      });
      coals.instanceMatrix.needsUpdate = true;
      camera.position.x = smooth.x * 0.6;
      camera.position.y = smooth.y * 0.3 + scroll * 0.8;
      camera.lookAt(0, 0, -2);
    }

    composer.render();
    if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
  }

  function loop() {
    if (!visible || document.hidden) { running = false; clock.stop(); return; }
    render(Math.min(clock.getDelta(), 0.05));
    requestAnimationFrame(loop);
  }

  function kick() {
    if (REDUCED) return;
    if (!running && visible && !document.hidden) {
      running = true;
      clock.start();
      requestAnimationFrame(loop);
    }
  }

  let disposed = false;
  const loopGuard = loop;
  layout();
  if (REDUCED) render(0); else kick();

  return {
    // 0..1 brightness ramp used by the shutter reveal
    setIntro(v) { renderer.toneMappingExposure = 0.25 + v * 0.8; if (REDUCED) render(0); },
    dispose() {
      if (disposed) return;
      disposed = true;
      visible = false;
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', kick);
      scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => m.dispose?.()); });
      composer.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss();
      void loopGuard;
    },
  };
}

