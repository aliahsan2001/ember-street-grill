/* The 3D steel tray. Every unit in the cart is a plate (a cup for drinks, a thali for deals)
   with the dish photo on top. Matter.js runs the physics in 2D (side view) and Three.js
   draws it in 3D, so dishes drop in with weight and settle on what's already there. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Matter from 'matter-js';
import { gsap } from '../core/motion.js';

const S = 100; // matter pixels per scene unit
const INNER_W = 5.0, INNER_D = 2.3, FLOOR_Y = 0.1;
const DRINK_TINT = { 'mint-margarita': '#7ccf6a', lassi: '#f3c34a', lime: '#e8f0b0', chai: '#b27a4a', 'soft-drink': '#3a1d12' };
const MAX_PIECES = 40;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const textureCache = new Map();
function plateTexture(src, rim) {
  const k = src + rim;
  if (textureCache.has(k)) return textureCache.get(k);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // ceramic (or steel) rim, then the dish photo cropped to a circle
  g.fillStyle = rim;
  g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3;
  g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
  const img = new Image();
  img.onload = () => {
    g.save();
    g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.clip();
    const s = Math.min(img.width, img.height);
    g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 28, 28, 200, 200);
    g.restore();
    tex.needsUpdate = true;
  };
  img.src = src;
  textureCache.set(k, tex);
  return tex;
}

export class Tray3D {
  constructor(canvas, imgUrl) {
    this.canvas = canvas;
    this.imgUrl = imgUrl;
    this.pieces = [];
    this.running = false;
    this.lastActive = 0;
    this.look = new THREE.Vector3(0, 0.45, 0);

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0, 3.8, 7.2);

    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    this.scene.environment = this.env;

    this.scene.add(new THREE.HemisphereLight(0xfff1e0, 0x2a1a12, 1.1));
    const key = new THREE.DirectionalLight(0xffe2c4, 2.2);
    key.position.set(-3, 6, 4);
    const warm = new THREE.PointLight(0xff7a2a, 6, 10, 1.5);
    warm.position.set(3, 2.2, 2.5);
    this.scene.add(key, warm);

    this.buildTray();
    this.buildPhysics();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.resize();
    this.render();
  }

  buildTray() {
    const steel = new THREE.MeshStandardMaterial({ color: '#c3c8ce', metalness: 1, roughness: 0.3 });
    const tray = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(INNER_W + 0.5, INNER_D + 0.5, 0.35), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), steel);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y - 0.08;
    const wallShape = roundedRect(INNER_W + 0.5, INNER_D + 0.5, 0.35);
    wallShape.holes.push(roundedRect(INNER_W, INNER_D, 0.18));
    const walls = new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 }), steel);
    walls.rotation.x = -Math.PI / 2;
    walls.position.y = FLOOR_Y - 0.08;
    // handles at each end
    [-1, 1].forEach((side) => {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 12, 32, Math.PI), steel);
      h.rotation.set(-Math.PI / 2, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      h.position.set(side * (INNER_W / 2 + 0.25), FLOOR_Y + 0.3, 0);
      tray.add(h);
    });
    tray.add(floor, walls);
    this.scene.add(tray);
  }

  buildPhysics() {
    const { Engine, Bodies, Composite } = Matter;
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = 1.6;
    const half = (INNER_W / 2) * S;
    Composite.add(this.engine.world, [
      Bodies.rectangle(0, 50, half * 4, 100, { isStatic: true, friction: 0.9 }),
      Bodies.rectangle(-half - 50, -1000, 100, 2400, { isStatic: true }),
      Bodies.rectangle(half + 50, -1000, 100, 2400, { isStatic: true }),
    ]);
  }

  resize() {
    const p = this.canvas.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // fit the tray's width whatever the aspect ratio
    this.camera.fov = THREE.MathUtils.clamp(34 / Math.min(1.6, this.camera.aspect) * 1.25, 26, 52);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  stackTop() {
    let top = 0;
    for (const p of this.pieces) if (!p.leaving) top = Math.max(top, -p.body.bounds.min.y / S);
    return top;
  }

  makeMesh(item) {
    const src = this.imgUrl(item.img, 640);
    if (item.kind === 'cup') {
      const tint = DRINK_TINT[item.id] || '#d9b98a';
      const side = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.15, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.92 });
      const top = new THREE.MeshStandardMaterial({ map: plateTexture(src, '#f1efe9'), roughness: 0.4 });
      const geo = new THREE.CylinderGeometry(0.28, 0.23, 0.72, 32);
      return { mesh: new THREE.Mesh(geo, [side, top, side]), w: 0.56, h: 0.72 };
    }
    const big = item.kind === 'platter';
    const r = big ? 0.86 : 0.58 + Math.random() * 0.06;
    const h = big ? 0.12 : 0.1;
    const rim = big ? '#c99a52' : '#f4f1ea';
    const side = new THREE.MeshStandardMaterial({ color: big ? '#b8863f' : '#efece6', metalness: big ? 0.9 : 0, roughness: big ? 0.3 : 0.35 });
    const top = new THREE.MeshStandardMaterial({ map: plateTexture(src, rim), roughness: 0.45, metalness: big ? 0.3 : 0 });
    const geo = new THREE.CylinderGeometry(r, r * 0.84, h, 48);
    return { mesh: new THREE.Mesh(geo, [side, top, side]), w: r * 2, h };
  }

  drop(item, delay = 0) {
    if (this.pieces.filter((p) => !p.leaving).length >= MAX_PIECES) return;
    const { Bodies, Composite, Body } = Matter;
    const { mesh, w, h } = this.makeMesh(item);
    const margin = w / 2 + 0.08;
    const x = (Math.random() * 2 - 1) * (INNER_W / 2 - margin);
    const y = -(this.stackTop() + 2.4 + Math.random() * 0.6);
    const body = Bodies.rectangle(x * S, y * S, w * S, h * S * (item.kind === 'cup' ? 1 : 1.3), {
      chamfer: { radius: Math.min(6, h * S * 0.5) }, friction: 0.85, frictionStatic: 1.2, restitution: 0.12, density: 0.002,
    });
    if (item.kind === 'cup') Body.setInertia(body, Infinity); // glasses land upright
    else {
      Body.setAngle(body, (Math.random() - 0.5) * 0.5);
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
    }
    mesh.position.set(x, FLOOR_Y - y, (Math.random() - 0.5) * 0.5);
    mesh.visible = false;
    this.scene.add(mesh);
    const piece = { key: item.key, body, mesh, leaving: false };
    this.pieces.push(piece);
    setTimeout(() => {
      mesh.visible = true;
      Composite.add(this.engine.world, body);
      this.wake();
    }, delay);
  }

  lift(key) {
    const piece = [...this.pieces].reverse().find((p) => p.key === key && !p.leaving);
    if (!piece) return;
    piece.leaving = true;
    Matter.Composite.remove(this.engine.world, piece.body);
    this.wake();
    gsap.to(piece.mesh.position, { y: '+=2.4', duration: 0.6, ease: 'power2.in' });
    gsap.to(piece.mesh.scale, {
      x: 0.2, y: 0.2, z: 0.2, duration: 0.6, ease: 'power2.in',
      onComplete: () => this.discard(piece),
    });
  }

  discard(piece) {
    this.scene.remove(piece.mesh);
    piece.mesh.geometry.dispose();
    this.pieces = this.pieces.filter((p) => p !== piece);
  }

  // match the plates in the tray to the cart, unit for unit
  sync(items, stagger = 0) {
    const want = new Map(items.map((i) => [i.key, i]));
    const have = new Map();
    this.pieces.filter((p) => !p.leaving).forEach((p) => have.set(p.key, (have.get(p.key) || 0) + 1));
    let n = 0;
    for (const [key, item] of want) {
      const diff = item.qty - (have.get(key) || 0);
      for (let i = 0; i < diff; i++) this.drop(item, stagger * n++);
      for (let i = 0; i < -diff; i++) this.lift(key);
    }
    for (const [key, count] of have) if (!want.has(key)) for (let i = 0; i < count; i++) this.lift(key);
  }

  wake() {
    this.lastActive = performance.now();
    if (!this.running) {
      this.running = true;
      this.prev = performance.now();
      requestAnimationFrame((t) => this.tick(t));
    }
  }

  tick(now) {
    if (!this.running) return;
    const dt = Math.min(32, now - this.prev);
    this.prev = now;
    Matter.Engine.update(this.engine, dt);
    let moving = false;
    for (const p of this.pieces) {
      if (p.leaving) { moving = true; continue; }
      const b = p.body;
      p.mesh.position.x = b.position.x / S;
      p.mesh.position.y = FLOOR_Y - b.position.y / S;
      p.mesh.rotation.z = -b.angle;
      if (!b.isSleeping) moving = true;
    }
    // frame the pile as it grows
    const top = this.stackTop();
    this.look.y += (Math.max(0.45, top * 0.55) - this.look.y) * 0.08;
    const camY = 3.8 + top * 0.7;
    this.camera.position.y += (camY - this.camera.position.y) * 0.08;
    this.render();
    if (moving || now - this.lastActive < 900) requestAnimationFrame((t) => this.tick(t));
    else this.running = false;
  }

  render() {
    this.camera.lookAt(this.look);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    this.ro.disconnect();
    this.renderer.dispose();
  }
}
